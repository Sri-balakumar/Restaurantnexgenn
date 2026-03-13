/**
 * KitchenBillPreview Screen
 *
 * Shows order items before sending KOT to kitchen.
 * Supports:
 *   - "Print Add-ons"  -> only NEW items since last print (delta)
 *   - "Print Full Order" -> all items
 *
 * ARCHITECTURE:
 *   This screen  --> kotService.printKot()  --> Odoo  --> KOT Printer
 *   APK never talks to printer. Odoo handles ESC/POS + TCP.
 *
 * NAVIGATION PARAMS:
 *   items       - Array of cart items [{ id, name, quantity/qty, note, product_id, price_unit }]
 *   orderId     - Odoo pos.order ID (number, optional)
 *   orderName   - e.g. "Order 00012"
 *   tableName   - e.g. "T 3"
 *   serverName  - waiter name
 *   order_type  - "DINEIN" | "TAKEAWAY" | null
 *   guest_count - number
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import kotService from '../../../../api/services/kotService';

// ── Snapshot store (tracks what was already printed) ───────────
// Simple in-memory store. Replace with Zustand/AsyncStorage if needed.
const _snapshots = {};

function getSnapshot(key) {
  return _snapshots[key] || [];
}

function setSnapshot(key, items) {
  _snapshots[key] = items.map((it) => ({
    id: it.id,
    name: it.name || (Array.isArray(it.product_id) ? it.product_id[1] : 'Item'),
    qty: Number(it.quantity ?? it.qty ?? 1),
  }));
}

function getDelta(key, currentItems) {
  const prev = getSnapshot(key);
  if (!prev.length) return currentItems;

  const prevMap = {};
  prev.forEach((it) => {
    const k = String(it.id ?? it.name);
    prevMap[k] = (prevMap[k] || 0) + it.qty;
  });

  const delta = [];
  currentItems.forEach((it) => {
    const k = String(it.id ?? it.name);
    const curQty = Number(it.quantity ?? it.qty ?? 1);
    const prevQty = prevMap[k] || 0;
    const diff = curQty - prevQty;
    if (diff > 0) {
      delta.push({ ...it, qty: diff, quantity: diff });
    }
  });
  return delta;
}

// ── Component ──────────────────────────────────────────────────

const KitchenBillPreview = ({ navigation, route }) => {
  const {
    items = [],
    orderId,
    orderName = '',
    tableName = '',
    serverName = '',
    order_type = null,
    guest_count = 0,
  } = route?.params || {};

  const [printingMode, setPrintingMode] = useState(null); // null | 'addons' | 'full'
  const [userName, setUserName] = useState(serverName);

  // ── Resolve logged-in user name ──────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('userData');
        const ud = raw ? JSON.parse(raw) : null;
        const name =
          ud?.related_profile?.name || ud?.user_name || ud?.name || serverName || '';
        if (name) setUserName(name);

        // kotService now reads session from AsyncStorage automatically
      } catch (e) {
        console.warn('[KOT] setup error:', e.message);
      }
    })();
  }, []);

  // ── Save initial snapshot for takeaway orders ────────────────
  const snapshotKey = orderId || orderName || null;

  useEffect(() => {
    const isTakeaway =
      String(order_type || '').toUpperCase() === 'TAKEAWAY' ||
      String(order_type || '').toUpperCase() === 'TAKEOUT';

    if (isTakeaway && snapshotKey && !getSnapshot(snapshotKey).length && items.length) {
      setSnapshot(snapshotKey, items);
    }
  }, [orderId, orderName, order_type, items.length]);

  // ── Map items to display format ──────────────────────────────
  const mapped = useMemo(
    () =>
      items.map((it) => ({
        id: String(it.id ?? it.name),
        name: it.name || (Array.isArray(it.product_id) ? it.product_id[1] : 'Item'),
        qty: Number(it.quantity ?? it.qty ?? 1),
        note: it.note || '',
      })),
    [items],
  );

  // ── Delta: items added since last print ──────────────────────
  const deltaItems = useMemo(() => {
    if (!snapshotKey) return mapped;
    const delta = getDelta(snapshotKey, items);
    return delta.map((it) => ({
      id: String(it.id ?? it.name),
      name: it.name || (Array.isArray(it.product_id) ? it.product_id[1] : 'Item'),
      qty: Number(it.quantity ?? it.qty ?? 1),
      note: it.note || '',
    }));
  }, [snapshotKey, items, mapped]);

  // ── Resolve order type label ─────────────────────────────────
  const isTakeaway =
    String(order_type || '').toUpperCase() === 'TAKEAWAY' ||
    String(order_type || '').toUpperCase() === 'TAKEOUT';

  const orderTypeLabel = isTakeaway
    ? 'Takeout'
    : order_type
      ? String(order_type).charAt(0).toUpperCase() + String(order_type).slice(1).toLowerCase()
      : 'Dine In';

  // ── Print handler ────────────────────────────────────────────
  const handlePrint = useCallback(
    async ({ deltaOnly = true } = {}) => {
      setPrintingMode(deltaOnly ? 'addons' : 'full');
      try {
        const printItems = deltaOnly
          ? (deltaItems.length ? deltaItems : mapped)
          : mapped;

        if (!printItems.length) {
          Alert.alert('No Items', 'Nothing to print.');
          return;
        }

        const kotData = {
          table_name: tableName,
          order_name: orderName,
          order_id: orderId || null,
          cashier: userName,
          order_type: orderTypeLabel,
          guest_count: guest_count,
          print_type: deltaOnly ? 'ADDON' : 'NEW',
          items: printItems.map((it) => ({
            name: it.name,
            qty: it.qty,
            note: it.note || '',
          })),
        };

        const result = await kotService.printKot(kotData);

        // Save snapshot after successful print
        if (snapshotKey) setSnapshot(snapshotKey, items);

        if (result && result.success !== false) {
          Alert.alert('KOT Printed', 'Kitchen Order Ticket sent to printer.');
        } else {
          const errMsg = result?.error || 'Failed to print KOT';
          if (errMsg.includes("doesn't exist") || errMsg.includes('does not exist')) {
            Alert.alert(
              'Module Not Installed',
              'The pos_kot_print module is not installed on this Odoo server.',
            );
          } else {
            Alert.alert('Print Error', errMsg);
          }
        }
      } catch (e) {
        Alert.alert('Print Error', e.message || 'Failed to print KOT');
      } finally {
        setPrintingMode(null);
      }
    },
    [deltaItems, mapped, tableName, orderName, orderId, userName, orderTypeLabel, guest_count, snapshotKey, items],
  );

  // ── Render a single line item ────────────────────────────────
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

  // ── UI ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Kitchen Bill</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* Order Info Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.orderTitle}>
                {orderName && orderName !== '/' ? orderName : orderId ? `Order #${orderId}` : 'Order'}
              </Text>
              {orderId && orderName && orderName !== '/' ? (
                <Text style={s.orderId}>#{orderId}</Text>
              ) : null}
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
                <Text style={s.infoLabel}>TABLE</Text>
                <Text style={s.infoValue}>{tableName}</Text>
              </View>
            ) : null}
            {userName ? (
              <View style={s.infoItem}>
                <Text style={s.infoLabel}>SERVER</Text>
                <Text style={s.infoValue}>{userName}</Text>
              </View>
            ) : null}
            <View style={s.infoItem}>
              <Text style={s.infoLabel}>ITEMS</Text>
              <Text style={s.infoValue}>{mapped.length}</Text>
            </View>
          </View>
        </View>

        {/* New / Add-on Items Section */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <View style={[s.dot, { backgroundColor: '#F47B20' }]} />
            <Text style={s.sectionTitle}>New Items</Text>
            {deltaItems.length > 0 && (
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>{deltaItems.length}</Text>
              </View>
            )}
          </View>
          {deltaItems.length > 0 ? (
            deltaItems.map(renderLine)
          ) : (
            <View style={s.emptyWrap}>
              <Text style={s.emptyText}>No new items since last print</Text>
            </View>
          )}
        </View>

        {/* Full Order Section */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <View style={[s.dot, { backgroundColor: '#7c3aed' }]} />
            <Text style={s.sectionTitle}>Full Order</Text>
            <View style={[s.countBadge, { backgroundColor: '#f3f0ff' }]}>
              <Text style={[s.countBadgeText, { color: '#7c3aed' }]}>{mapped.length}</Text>
            </View>
          </View>
          {mapped.map(renderLine)}
        </View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          disabled={!!printingMode}
          onPress={() => handlePrint({ deltaOnly: true })}
          style={[s.primaryBtn, printingMode === 'addons' && { opacity: 0.7 }]}
          activeOpacity={0.85}
        >
          {printingMode === 'addons' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.primaryBtnText}>Print Add-ons</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          disabled={!!printingMode}
          onPress={() => handlePrint({ deltaOnly: false })}
          style={[s.secondaryBtn, printingMode === 'full' && { opacity: 0.7 }]}
          activeOpacity={0.85}
        >
          {printingMode === 'full' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.secondaryBtnText}>Print Full Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default KitchenBillPreview;

// ── Styles ─────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f2f8' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2E294E',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: { width: 60 },
  backText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#1a1a2e', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f8',
  },
  orderTitle: { fontSize: 18, fontWeight: '900', color: '#1a1a2e' },
  orderId: { fontSize: 12, color: '#8896ab', fontWeight: '600', marginTop: 2 },
  typeBadge: {
    backgroundColor: '#fff5eb',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F47B2040',
  },
  typeBadgeText: { fontSize: 12, fontWeight: '800', color: '#F47B20' },

  // Info grid
  infoGrid: { flexDirection: 'row', gap: 12 },
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
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: { fontSize: 14, fontWeight: '800', color: '#1a1a2e' },

  // Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f8',
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  sectionTitle: { fontWeight: '800', fontSize: 16, color: '#1a1a2e', flex: 1 },
  countBadge: {
    backgroundColor: '#fff5eb',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  countBadgeText: { fontSize: 13, fontWeight: '800', color: '#F47B20' },
  emptyWrap: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { color: '#8896ab', fontWeight: '600', fontSize: 13 },

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
  lineQtyText: { fontSize: 14, fontWeight: '900', color: '#1a1a2e' },
  lineInfo: { flex: 1 },
  lineName: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  lineNote: { color: '#8896ab', fontSize: 12, marginTop: 2 },

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
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    backgroundColor: '#F47B20',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
