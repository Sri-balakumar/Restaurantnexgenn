import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Platform } from 'react-native';
import { NavigationHeader } from '@components/Header';
import { SafeAreaView } from '@components/containers';
import { fetchPosPresets, fetchOrders, fetchPosOrderById, fetchOrderLinesByIds } from '@api/services/generalApi';
import { callKw } from '@api/services/kotService';
import { useFocusEffect } from '@react-navigation/native';
import { formatCurrency } from '@utils/formatters/currency';
import { useTranslation } from '@hooks';

const TakeawayOrdersScreen = ({ navigation, route }) => {
  const { sessionId, userId, userName } = route?.params || {};
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const { t } = useTranslation();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch presets, orders, and tax rates in parallel
      const [presetsResp, ordersResp, taxResp] = await Promise.all([
        fetchPosPresets(),
        fetchOrders({ sessionId, limit: 500, fields: ['id','name','state','amount_total','table_id','create_date','preset_id','lines','floating_order_name'] }),
        callKw('account.tax', 'search_read', [[]], { fields: ['id', 'amount', 'price_include'], limit: 500 }),
      ]);
      const presets = (presetsResp && presetsResp.result) || [];
      const takePresetIds = presets.filter(p => String(p.name || '').toLowerCase().includes('take')).map(p => p.id);
      const all = (ordersResp && ordersResp.result) || [];
      const filtered = all.filter(o => {
        const p = Array.isArray(o.preset_id) ? o.preset_id[0] : o.preset_id;
        if (!p || !takePresetIds.includes(p)) return false;
        const hasLines = Array.isArray(o.lines) ? o.lines.length > 0 : Number(o.amount_total || 0) > 0;
        return hasLines;
      });

      // Build tax map: taxId -> { amount, priceInclude }
      const taxMap = {};
      (taxResp || []).forEach(t => { taxMap[t.id] = { amount: Number(t.amount) || 0, priceInclude: !!t.price_include }; });

      // Collect every line across all filtered orders in one RPC
      const allLineIds = [];
      filtered.forEach(o => { if (Array.isArray(o.lines)) allLineIds.push(...o.lines); });

      let linesByOrder = {};
      let productIds = new Set();
      if (allLineIds.length > 0) {
        const groupedResp = await callKw('pos.order.line', 'search_read',
          [[['id', 'in', allLineIds]]],
          { fields: ['id', 'order_id', 'product_id', 'qty', 'price_unit'], limit: allLineIds.length });
        (groupedResp || []).forEach(l => {
          const oid = Array.isArray(l.order_id) ? l.order_id[0] : l.order_id;
          const pid = Array.isArray(l.product_id) ? l.product_id[0] : l.product_id;
          if (pid) productIds.add(pid);
          if (!linesByOrder[oid]) linesByOrder[oid] = [];
          linesByOrder[oid].push({ qty: Number(l.qty || 0), price_unit: Number(l.price_unit || 0), productId: pid });
        });
      }

      // Fetch taxes_id per referenced product
      let productTaxMap = {};
      if (productIds.size > 0) {
        const prodResp = await callKw('product.product', 'search_read',
          [[['id', 'in', Array.from(productIds)]]],
          { fields: ['id', 'taxes_id'], limit: productIds.size });
        (prodResp || []).forEach(p => {
          productTaxMap[p.id] = Array.isArray(p.taxes_id) ? p.taxes_id : [];
        });
      }

      // Compute tax-inclusive total per order using the same rule as the register
      const withTax = filtered.map(o => {
        const lines = linesByOrder[o.id] || [];
        let total = 0;
        lines.forEach(l => {
          const net = l.qty * l.price_unit;
          let addOn = 0;
          (productTaxMap[l.productId] || []).forEach(tid => {
            const t = taxMap[tid];
            if (t && !t.priceInclude) addOn += t.amount;
          });
          total += net * (1 + addOn / 100);
        });
        const totalRounded = Math.round(total * 1000) / 1000;
        return { ...o, amount_total_incl: totalRounded > 0 ? totalRounded : Number(o.amount_total || 0) };
      });

      setOrders(withTax);
    } catch (e) {
      Alert.alert(t.error, t.failedToLoadOrders);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openOrder = async (order) => {
    try {
      const orderResp = await fetchPosOrderById(order.id);
      const rec = orderResp && orderResp.result ? orderResp.result : null;
      const lineIds = rec && Array.isArray(rec.lines) ? rec.lines : [];
      let orderLines = [];
      if (lineIds.length > 0) {
        const linesResp = await fetchOrderLinesByIds(lineIds);
        orderLines = linesResp && linesResp.result ? linesResp.result : [];
      }
      navigation.navigate('POSProducts', { ...route?.params, orderId: order.id, orderLines, cartOwner: `order_${order.id}`, order_type: 'TAKEAWAY', orderState: order.state });
    } catch (e) {
      Alert.alert(t.error, t.failedToOpenOrder);
    }
  };

  const getStatusColor = (state) => {
    switch (state) {
      case 'draft': return { bg: '#eff6ff', text: '#2563eb' };
      case 'paid': case 'done': return { bg: '#f0fdf4', text: '#16a34a' };
      case 'cancel': return { bg: '#fef2f2', text: '#dc2626' };
      default: return { bg: '#f5f3ff', text: '#7c3aed' };
    }
  };

  const getStatusLabel = (state) => {
    switch (state) {
      case 'draft': return t.open;
      case 'paid': return t.paid;
      case 'done': return t.done;
      case 'cancel': return t.cancelled;
      default: return state || t.open;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const mon = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hr = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${mon}/${year}  ${hr}:${min}`;
    } catch (_) {
      return dateStr;
    }
  };

  const renderItem = ({ item, index }) => {
    const status = getStatusColor(item.state);
    const customerName = item.floating_order_name || '';
    const orderRef = item.name && item.name !== '/' ? item.name : `${t.order} #${item.id}`;
    const lineDetails = item._lineDetails || [];
    return (
      <TouchableOpacity onPress={() => openOrder(item)} style={s.card} activeOpacity={0.7}>
        <View style={s.cardRow}>
          <View style={s.cardIconWrap}>
            <Text style={s.cardIcon}>🛍️</Text>
          </View>
          <View style={{ flex: 1 }}>
            {customerName ? <Text style={s.cardTitle}>{customerName}</Text> : null}
            <Text style={customerName ? s.cardOrderRef : s.cardTitle}>{orderRef}</Text>
            <Text style={s.cardDate}>{formatDate(item.create_date)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.cardAmount}>{formatCurrency(item.amount_total_incl ?? item.amount_total ?? 0)}</Text>
            <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[s.statusText, { color: status.text }]}>{getStatusLabel(item.state)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <NavigationHeader title={t.takeawayOrders} onBackPress={() => navigation.goBack()} logo={false} />
      <View style={s.container}>
        {/* Summary bar */}
        <View style={s.summaryBar}>
          <View style={s.summaryItem}>
            <Text style={s.summaryCount}>{orders.length}</Text>
            <Text style={s.summaryLabel}>{t.totalOrders}</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryCount}>{orders.filter(o => o.state === 'draft').length}</Text>
            <Text style={s.summaryLabel}>{t.open}</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryCount}>{orders.filter(o => o.state === 'paid' || o.state === 'done').length}</Text>
            <Text style={s.summaryLabel}>{t.completed}</Text>
          </View>
        </View>

        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={s.loadingText}>{t.loadingOrders}</Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={o => String(o.id)}
            renderItem={renderItem}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={s.emptyIcon}>📭</Text>
                <Text style={s.emptyTitle}>{t.noTakeawayOrders}</Text>
                <Text style={s.emptySub}>{t.takeawayOrdersAppear}</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f8',
    paddingHorizontal: 16,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#1a1a2e', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 3 },
    }),
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8896ab',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e5e7eb',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#1a1a2e', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  cardOrderRef: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8896ab',
    marginTop: 1,
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8896ab',
    marginTop: 3,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 20,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#8896ab',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  emptySub: {
    fontSize: 14,
    color: '#8896ab',
    marginTop: 4,
  },
});

export default TakeawayOrdersScreen;
