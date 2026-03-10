import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, StatusBar, Modal, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationHeader } from '@components/Header';
import { COLORS } from '@constants/theme';
import { printAndShareReceipt } from '@print/printReceipt';
import { buildKitchenBillHtml } from '@utils/printing/kitchenBillHtml';
import AsyncStorage from '@react-native-async-storage/async-storage';
import kotService from '@api/services/kotService';
import { addLineToOrderOdoo, fetchPosOrderById, fetchOrderLinesByIds } from '@api/services/generalApi';
import useKitchenTickets from '@stores/kitchen/ticketsStore';

const KitchenBillPreview = ({ navigation, route }) => {
  const { items = [], orderId, orderName = '', tableName = '', serverName = '', order_type = null, cartOwner = null } = route?.params || {};
  const [printing, setPrinting] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [resolvedUserName, setResolvedUserName] = useState(serverName);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewMode, setPreviewMode] = useState('full');
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

  const handleShowPreview = ({ deltaOnly = true } = {}) => {
    const list = deltaOnly ? (deltaItems.length ? deltaItems : mapped) : mapped;
    const html = buildKitchenBillHtml({
      restaurant: 'My Restaurant',
      orderName,
      orderId: orderId || null,
      tableName,
      serverName: resolvedUserName,
      items: list,
      order_type,
      mode: deltaOnly ? 'addons' : 'full',
    });
    setPreviewHtml(html);
    setPreviewMode(deltaOnly ? 'addons' : 'full');
    setPreviewVisible(true);
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

  const handlePrintFromPreview = async () => {
    setPrinting(true);
    try {
      let resolvedName = serverName;
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        const ud = userDataStr ? JSON.parse(userDataStr) : null;
        resolvedName = ud?.related_profile?.name || ud?.user_name || ud?.name || serverName || resolvedName;
      } catch (e) {}

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
        print_type: previewMode === 'addons' ? 'ADDON' : 'NEW',
        items: (previewMode === 'addons' ? deltaItems : mapped).map((it) => ({
          name: it.name,
          qty: it.qty,
          note: it.note || '',
        })),
      };
      const snapshotKey = orderId || cartOwner || null;
      if (snapshotKey) setSnapshot(snapshotKey, items);
      const result = await kotService.printKot(kotData);
      if (result && result.success !== false) {
        setPreviewVisible(false);
        Alert.alert('KOT Printed', 'Kitchen Order Ticket sent to printer.');
      } else {
        Alert.alert('Print error', result?.error || 'Failed to print KOT');
      }
    } catch (e) {
      Alert.alert('Print error', e.message || 'Failed to print KOT');
    } finally {
      setPrinting(false);
    }
  };

  const renderLine = (item, index) => (
    <View key={`${item.id}_${index}`} style={s.lineRow}>
      <Text style={s.lineText}>{item.qty} x {item.name}</Text>
      {item.note ? <Text style={s.lineNote}>{item.note}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0 }}>
        <NavigationHeader title="Kitchen Bill" onBackPress={() => navigation.goBack()} />
      </View>

      {/* Scrollable content */}
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <View style={s.card}>
          <Text style={s.orderTitle}>Order: {orderName || ''}</Text>
          {orderId ? <Text style={s.meta}>Order ID: #{orderId}</Text> : null}
          {tableName ? <Text style={s.meta}>Table: {tableName}</Text> : null}
          {resolvedUserName ? <Text style={s.meta}>Server: {resolvedUserName}</Text> : null}
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Add-ons since last print</Text>
          {deltaItems.length > 0 ? (
            deltaItems.map(renderLine)
          ) : (
            <Text style={s.emptyText}>No new items. Printing will include all items.</Text>
          )}

          <View style={s.separator} />

          <Text style={s.sectionTitle}>Full order ({mapped.length} items)</Text>
          {mapped.map(renderLine)}
        </View>
      </ScrollView>

      {/* Fixed bottom buttons — always visible */}
      <View style={s.bottomBar}>
        <TouchableOpacity disabled={printing} onPress={() => handleShowPreview({ deltaOnly: true })} style={s.primaryBtn}>
          <Text style={s.btnText}>{printing ? 'Printing…' : 'Print Add-ons Only'}</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={printing} onPress={() => handleShowPreview({ deltaOnly: false })} style={s.secondaryBtn}>
          <Text style={s.btnText}>{printing ? 'Printing…' : 'Print Full Order'}</Text>
        </TouchableOpacity>
      </View>

      {/* Receipt Preview Modal */}
      <Modal visible={previewVisible} animationType="slide" onRequestClose={() => setPreviewVisible(false)}>
        <SafeAreaView style={s.previewSafe}>
          <View style={{ flex: 1 }}>
            <WebView originWhitelist={["*"]} source={{ html: previewHtml }} style={{ flex: 1 }} />
          </View>
          <View style={s.previewActions}>
            <TouchableOpacity onPress={() => setPreviewVisible(false)} style={s.cancelBtn}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePrintFromPreview} disabled={printing} style={s.printBtn}>
              <Text style={s.btnText}>{printing ? 'Printing…' : 'Print'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default KitchenBillPreview;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12 },
  orderTitle: { fontSize: 16, fontWeight: '800' },
  meta: { color: '#6b7280', marginTop: 4 },
  sectionTitle: { fontWeight: '800', marginBottom: 8 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  lineText: { fontWeight: '700' },
  lineNote: { color: '#6b7280' },
  emptyText: { color: '#6b7280' },
  separator: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 12 },
  bottomBar: { padding: 16, paddingBottom: 24, backgroundColor: '#f8fafc', borderTopWidth: 1, borderColor: '#e5e7eb' },
  primaryBtn: { backgroundColor: COLORS.primary || '#111827', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  secondaryBtn: { backgroundColor: '#4b5563', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800' },
  previewSafe: { flex: 1, backgroundColor: '#fff' },
  previewActions: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
  cancelBtn: { backgroundColor: '#ccc', padding: 14, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  cancelText: { fontWeight: '800' },
  printBtn: { backgroundColor: COLORS.primary || '#111827', padding: 14, borderRadius: 8, minWidth: 100, alignItems: 'center' },
});
