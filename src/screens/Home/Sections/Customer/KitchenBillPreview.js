import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationHeader } from '@components/Header';
import { COLORS } from '@constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import kotService from '@api/services/kotService';
import { addLineToOrderOdoo, fetchPosOrderById, fetchOrderLinesByIds } from '@api/services/generalApi';
import useKitchenTickets from '@stores/kitchen/ticketsStore';

const KitchenBillPreview = ({ navigation, route }) => {
  const { items = [], orderId, orderName = '', tableName = '', serverName = '', order_type = null, cartOwner = null } = route?.params || {};
  const [printingMode, setPrintingMode] = useState(null); // null | 'addons' | 'full'
  const [resolvedUserName, setResolvedUserName] = useState(serverName);
  const getDelta = useKitchenTickets((s) => s.getDelta);
  const setSnapshot = useKitchenTickets((s) => s.setSnapshot);
  const snapshot = useKitchenTickets((s) => (orderId ? (s.snapshots[orderId] || {}) : (cartOwner ? (s.snapshots[cartOwner] || {}) : {})));

  React.useEffect(() => {
    (async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        const ud = userDataStr ? JSON.parse(userDataStr) : null;
        const name = ud?.related_profile?.name || ud?.user_name || ud?.name || serverName || '';
        if (name) setResolvedUserName(name);
      } catch (e) {}
    })();

    const snapshotKey = orderId || cartOwner || null;
    if (String(order_type).toUpperCase() === 'TAKEAWAY' && snapshotKey && Object.keys(snapshot || {}).length === 0 && Array.isArray(items) && items.length > 0) {
      try { setSnapshot(snapshotKey, items); } catch (e) {}
    }
  }, [orderId, cartOwner, order_type, items]);

  const mapped = useMemo(() => items.map((it) => ({
    id: String(it.id ?? `${it.name}`),
    name: it.name || it.product_id?.[1] || 'Item',
    qty: Number(it.quantity ?? it.qty ?? 1),
    note: it.note || '',
  })), [items]);

  const deltaItems = useMemo(() => {
    const snapshotKey = orderId || cartOwner || null;
    if (!snapshotKey) {
      if (String(order_type || '').toUpperCase() === 'TAKEAWAY') return [];
      return mapped;
    }
    const delta = getDelta(snapshotKey, items);
    return delta.map((it) => ({
      id: String(it.id ?? `${it.name}`),
      name: it.name || it.product_id?.[1] || 'Item',
      qty: Number(it.quantity ?? it.qty ?? 1),
      note: it.note || '',
    }));
  }, [orderId, cartOwner, order_type, items, mapped, snapshot]);

  const resolveProductId = (it) => {
    if (Array.isArray(it.product_id) && Number.isInteger(it.product_id[0])) return it.product_id[0];
    if (Number.isInteger(it.remoteId)) return it.remoteId;
    if (typeof it.id === 'number') return it.id;
    return null;
  };

  const ensureOrderSynced = async () => {
    if (!orderId) return;
    try {
      const orderResp = await fetchPosOrderById(orderId);
      const lineIds = orderResp?.result?.lines || [];
      let serverLines = [];
      if (lineIds.length) {
        const linesResp = await fetchOrderLinesByIds(lineIds);
        serverLines = linesResp?.result || [];
      }
      const serverQtyByProduct = {};
      serverLines.forEach((l) => {
        const pid = Array.isArray(l.product_id) ? l.product_id[0] : l.product_id;
        const qty = Number(l.qty || 0);
        if (pid) serverQtyByProduct[pid] = (serverQtyByProduct[pid] || 0) + qty;
      });
      const desiredQtyByProduct = {};
      items.forEach((it) => {
        const pid = resolveProductId(it);
        const qty = Number(it.quantity ?? it.qty ?? 1);
        if (pid) desiredQtyByProduct[pid] = (desiredQtyByProduct[pid] || 0) + qty;
      });
      const productsIndex = {};
      items.forEach((it) => {
        const pid = resolveProductId(it);
        if (pid && !productsIndex[pid]) productsIndex[pid] = it;
      });
      const additions = [];
      Object.keys(desiredQtyByProduct).forEach((pidStr) => {
        const pid = Number(pidStr);
        const desired = desiredQtyByProduct[pid] || 0;
        const have = serverQtyByProduct[pid] || 0;
        const delta = desired - have;
        if (delta > 0) additions.push({ pid, delta });
      });
      for (const add of additions) {
        const template = productsIndex[add.pid] || {};
        const priceUnit = Number(template.price_unit ?? template.price ?? 0);
        const name = template.name || (Array.isArray(template.product_id) ? template.product_id[1] : 'Item');
        await addLineToOrderOdoo({ orderId, productId: add.pid, qty: add.delta, price_unit: priceUnit, name });
      }
    } catch (e) {}
  };

  useEffect(() => {
    const setupKot = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        const userData = userDataStr ? JSON.parse(userDataStr) : {};
        const db = await AsyncStorage.getItem('odoo_db');
        kotService.setup({
          odooUrl: 'http://192.168.100.175:8079',
          database: db || 'nexgenn-restaurant',
          uid: userData.uid,
          password: userData.password || 'admin',
          printerIp: '192.168.100.103',
          printerPort: 9100,
        });
      } catch (e) {}
    };
    setupKot();
  }, []);

  const handleDirectPrint = async ({ deltaOnly = true } = {}) => {
    setPrintingMode(deltaOnly ? 'addons' : 'full');
    try {
      let resolvedName = serverName;
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        const ud = userDataStr ? JSON.parse(userDataStr) : null;
        resolvedName = ud?.related_profile?.name || ud?.user_name || ud?.name || serverName || resolvedName;
      } catch (e) {}

      // Ensure all items are synced to Odoo before printing
      await ensureOrderSynced();

      const printItems = deltaOnly ? (deltaItems.length ? deltaItems : mapped) : mapped;
      const isTakeaway = String(order_type || '').toUpperCase() === 'TAKEAWAY' || String(order_type || '').toUpperCase() === 'TAKEOUT';
      const kotData = {
        table_name: tableName,
        order_name: orderName,
        order_id: orderId || null,
        cashier: resolvedName,
        order_type: isTakeaway ? 'Takeout' : (order_type ? String(order_type) : undefined),
        order_type_label: isTakeaway ? 'Takeout' : (order_type ? (String(order_type).charAt(0).toUpperCase() + String(order_type).slice(1).toLowerCase()) : undefined),
        order_number: orderName || (orderId ? String(orderId) : undefined),
        guest_count: route?.params?.guest_count ?? 0,
        waiter: resolvedName,
        print_type: deltaOnly ? 'ADDON' : 'NEW',
        items: printItems.map((it) => ({
          name: it.name,
          qty: it.qty,
          note: it.note || '',
        })),
      };
      const snapshotKey = orderId || cartOwner || null;
      if (snapshotKey) setSnapshot(snapshotKey, items);
      const result = await kotService.printKot(kotData);
      if (result && result.success !== false) {
        Alert.alert('KOT Printed', 'Kitchen Order Ticket sent to printer.');
      } else {
        Alert.alert('Print error', result?.error || 'Failed to print KOT');
      }
    } catch (e) {
      Alert.alert('Print error', e.message || 'Failed to print KOT');
    } finally {
      setPrintingMode(null);
    }
  };

  const renderLine = (item, index) => (
    <View key={`${item.id}_${index}`} style={s.lineRow}>
      <View style={s.lineQtyBadge}>
        <Text style={s.lineQtyText}>{item.qty}</Text>
      </View>
      <View style={s.lineInfo}>
        <Text style={s.lineName}>{item.name}</Text>
        {item.note ? <Text style={s.lineNote}>{item.note}</Text> : null}
      </View>
    </View>
  );

  const isTakeaway = String(order_type || '').toUpperCase() === 'TAKEAWAY' || String(order_type || '').toUpperCase() === 'TAKEOUT';

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0, backgroundColor: COLORS.primaryThemeColor || '#2E294E' }}>
        <NavigationHeader title="Kitchen Bill" onBackPress={() => navigation.goBack()} logo={false} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* Order info card */}
        <View style={s.infoCard}>
          <View style={s.infoHeader}>
            <Text style={s.infoIcon}>🧾</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.orderTitle}>{(orderName && orderName !== '/') ? orderName : (orderId ? `Order #${orderId}` : 'Order')}</Text>
              {orderId && orderName && orderName !== '/' ? <Text style={s.orderId}>#{orderId}</Text> : null}
            </View>
            {isTakeaway && (
              <View style={s.typeBadge}>
                <Text style={s.typeBadgeText}>Takeout</Text>
              </View>
            )}
          </View>

          <View style={s.infoGrid}>
            {tableName ? (
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Table</Text>
                <Text style={s.infoValue}>{tableName}</Text>
              </View>
            ) : null}
            {resolvedUserName ? (
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>Server</Text>
                <Text style={s.infoValue}>{resolvedUserName}</Text>
              </View>
            ) : null}
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>Items</Text>
              <Text style={s.infoValue}>{mapped.length}</Text>
            </View>
          </View>
        </View>

        {/* Add-ons section */}
        {deltaItems.length > 0 ? (
          <View style={s.sectionCard}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionDot, { backgroundColor: '#F47B20' }]} />
              <Text style={s.sectionTitle}>New Items</Text>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>{deltaItems.length}</Text>
              </View>
            </View>
            {deltaItems.map(renderLine)}
          </View>
        ) : (
          <View style={s.sectionCard}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionDot, { backgroundColor: '#22c55e' }]} />
              <Text style={s.sectionTitle}>New Items</Text>
            </View>
            <View style={s.emptyWrap}>
              <Text style={s.emptyText}>No new items since last print</Text>
            </View>
          </View>
        )}

        {/* Full order section */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionDot, { backgroundColor: '#7c3aed' }]} />
            <Text style={s.sectionTitle}>Full Order</Text>
            <View style={[s.countBadge, { backgroundColor: '#f3f0ff' }]}>
              <Text style={[s.countBadgeText, { color: '#7c3aed' }]}>{mapped.length}</Text>
            </View>
          </View>
          {mapped.map(renderLine)}
        </View>
      </ScrollView>

      {/* Bottom buttons */}
      <View style={s.bottomBar}>
        <TouchableOpacity disabled={!!printingMode} onPress={() => handleDirectPrint({ deltaOnly: true })} style={[s.primaryBtn, printingMode === 'addons' && { opacity: 0.7 }]} activeOpacity={0.85}>
          <Text style={s.primaryBtnIcon}>🖨️</Text>
          <Text style={s.primaryBtnText}>{printingMode === 'addons' ? 'Printing...' : 'Print Add-ons'}</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={!!printingMode} onPress={() => handleDirectPrint({ deltaOnly: false })} style={[s.secondaryBtn, printingMode === 'full' && { opacity: 0.7 }]} activeOpacity={0.85}>
          <Text style={s.secondaryBtnIcon}>📋</Text>
          <Text style={s.secondaryBtnText}>{printingMode === 'full' ? 'Printing...' : 'Print Full Order'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default KitchenBillPreview;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f2f8' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 16 },

  // Info card
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#1a1a2e', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f8',
  },
  infoIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: 0.3,
  },
  orderId: {
    fontSize: 12,
    color: '#8896ab',
    fontWeight: '600',
    marginTop: 2,
  },
  typeBadge: {
    backgroundColor: '#fff5eb',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F47B2040',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F47B20',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    backgroundColor: '#f8f9fc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8896ab',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
  },

  // Section cards
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#1a1a2e', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 3 },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f8',
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: '#1a1a2e',
    flex: 1,
    letterSpacing: 0.2,
  },
  countBadge: {
    backgroundColor: '#fff5eb',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F47B20',
  },
  emptyWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8896ab',
    fontWeight: '600',
    fontSize: 13,
  },

  // Line items
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fc',
  },
  lineQtyBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f0f2f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lineQtyText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  lineInfo: {
    flex: 1,
  },
  lineName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  lineNote: {
    color: '#8896ab',
    fontSize: 12,
    marginTop: 2,
  },

  // Bottom bar
  bottomBar: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#1a1a2e', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } },
      android: { elevation: 12 },
    }),
  },
  primaryBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#7c3aed', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  primaryBtnIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    backgroundColor: '#F47B20',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#F47B20', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  secondaryBtnIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  secondaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },

});
