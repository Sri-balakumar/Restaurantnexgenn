import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchRestaurantTablesOdoo, fetchOpenOrdersByTable, createDraftPosOrderOdoo, fetchPosPresets, fetchOrders, fetchPosOrderById, fetchOrderLinesByIds, preloadAllProducts } from '@api/services/generalApi';
import { useFocusEffect } from '@react-navigation/native';

const { width: windowWidth } = Dimensions.get('window');


const TablesScreen = ({ navigation, route }) => {
  const [tables, setTables] = useState([]);
  const [floors, setFloors] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [tablesWithOpenOrders, setTablesWithOpenOrders] = useState([]);

  const setTableLoadingState = (id, value) => setTableLoading(prev => ({ ...prev, [id]: value }));

  // Helper to refresh which tables have open orders
  const refreshTablesWithOpenOrders = async () => {
    try {
      const allResp = await fetchOrders({ sessionId: route?.params?.sessionId, limit: 500 });
      if (allResp && allResp.result) {
        // Treat a broader set of closing states as final so table is cleared when orders are paid
        const CLOSED_STATES = ['done', 'cancel', 'paid', 'receipt', 'invoiced', 'posted'];
        // Only consider orders that are open and have a positive total amount
        const openOrders = allResp.result.filter(o => Array.isArray(o.table_id) && o.state && !CLOSED_STATES.includes(String(o.state)));
        const tableHasPositive = {};
        openOrders.forEach(o => {
          const tableArr = o.table_id;
          if (!Array.isArray(tableArr) || !tableArr[0]) return;
          const tableId = Number(tableArr[0]);
          const amt = Number(o.amount_total || 0);
          if (!tableHasPositive[tableId]) tableHasPositive[tableId] = false;
          if (amt > 0) tableHasPositive[tableId] = true;
        });
        const openTableIds = Object.keys(tableHasPositive).filter(tid => tableHasPositive[tid]).map(tid => Number(tid));
        setTablesWithOpenOrders(openTableIds);
      }
    } catch (err) {
      setTablesWithOpenOrders([]);
    }
  };

  // Refresh open-table state when screen becomes focused (e.g., after returning from external Odoo payments)
  useFocusEffect(
    useCallback(() => {
      refreshTablesWithOpenOrders();
    }, [])
  );

  const handleTablePress = async (table) => {
    setGlobalLoading(true);
    const tableId = table.id;
    // Preload all products in background while fetching order data — so products are cached when user taps "Add Products"
    preloadAllProducts().catch(() => {});
    try {
      // Log all orders for this table (use fetchOrders and filter client-side)
      try {
        const allResp = await fetchOrders({ sessionId: route?.params?.sessionId, limit: 500 });
        if (allResp && allResp.result) {
          const tableOrders = allResp.result.filter(o => Array.isArray(o.table_id) ? Number(o.table_id[0]) === Number(tableId) : false);
            // Fetch each order's full details to read `preset_id` (many2one) and log it
          try {
            const detailsPromises = tableOrders.map(o => fetchPosOrderById(o.id).catch(e => ({ error: e })));
            const details = await Promise.all(detailsPromises);
            // collect preset ids present on the returned recs
            const presetIds = [];
            details.forEach(d => {
              const rec = d && d.result ? d.result : null;
              if (rec && Array.isArray(rec.preset_id) && rec.preset_id[0]) presetIds.push(Number(rec.preset_id[0]));
            });
            let presetsById = {};
            if (presetIds.length > 0) {
              try {
                const presetsResp = await fetchPosPresets({ limit: 200 });
                if (presetsResp && presetsResp.result) {
                  presetsById = presetsResp.result.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
                }
              } catch (pErr) {
              }
            }

            const enriched = details.map((d, idx) => {
              const rec = d && d.result ? d.result : null;
              const base = tableOrders[idx] || {};
              const presetRef = rec && Array.isArray(rec.preset_id) ? rec.preset_id : (base && base.preset_id ? base.preset_id : null);
              const presetDetail = Array.isArray(presetRef) && presetRef[0] ? (presetsById[presetRef[0]] || { id: presetRef[0], name: presetRef[1] }) : null;
              return {
                id: base.id || (rec && rec.id),
                name: base.name || (rec && rec.name),
                amount_total: base.amount_total || (rec && rec.amount_total),
                state: base.state || (rec && rec.state),
                create_date: base.create_date || (rec && rec.create_date),
                table_id: base.table_id || (rec && rec.table_id),
                preset_id: presetRef || null,
                preset: presetDetail,
              };
            });
            // Use the original `details` array when fetching order lines to avoid duplicating the full record
            for (let idx = 0; idx < enriched.length; idx++) {
              const orderEntry = enriched[idx];
              try {
                const d = details[idx];
                const rec = d && d.result ? d.result : null;
                const oid = orderEntry.id;
                const lineIds = rec && Array.isArray(rec.lines) ? rec.lines : (orderEntry.lines || []);
                if (Array.isArray(lineIds) && lineIds.length > 0) {
                  const linesResp = await fetchOrderLinesByIds(lineIds);
                  if (linesResp && linesResp.result) {
                  } else {
                  }
                } else {
                }
              } catch (lineErr) {
              }
            }
          } catch (innerErr) {
          }
        }
      } catch (logErr) {
      }
      setTableLoadingState(tableId, true);
      // Refresh open tables after any order navigation
      await refreshTablesWithOpenOrders();
      // 1) search for existing open order
      const existing = await fetchOpenOrdersByTable(tableId);
      if (existing && existing.result && existing.result.length > 0) {
        const order = existing.result[0];
        // fetch the order's full details and its order lines, then navigate with orderLines
        try {
          const orderResp = await fetchPosOrderById(order.id);
          const lineIds = orderResp && orderResp.result && Array.isArray(orderResp.result.lines) ? orderResp.result.lines : [];
          let orderLines = [];
          if (lineIds.length > 0) {
            const linesResp = await fetchOrderLinesByIds(lineIds);
            if (linesResp && linesResp.result) orderLines = linesResp.result;
          }
          // derive preset from the full order response if present, otherwise fall back to the brief order record
          const presetRef = (orderResp && orderResp.result && Array.isArray(orderResp.result.preset_id) && orderResp.result.preset_id[0])
            ? orderResp.result.preset_id
            : (Array.isArray(order.preset_id) ? order.preset_id : null);
          const presetDetail = Array.isArray(presetRef) && presetRef[0] ? { id: presetRef[0], name: presetRef[1] } : null;
          navigation.navigate('POSProducts', { ...route?.params, orderId: order.id, tableId, orderLines, preset: presetDetail, preset_id: presetRef });
        } catch (e) {
          // Even if preloading failed, still pass any preset info available on the brief order record
          const presetRef = Array.isArray(order.preset_id) ? order.preset_id : null;
          const presetDetail = Array.isArray(presetRef) && presetRef[0] ? { id: presetRef[0], name: presetRef[1] } : null;
          navigation.navigate('POSProducts', { ...route?.params, orderId: order.id, tableId, preset: presetDetail, preset_id: presetRef });
        }
      } else {
        // 2) create a draft order — fetch presets first and pick a valid preset_id (prefer Dine In)
        const sessionId = route?.params?.sessionId;
        const userId = route?.params?.userId;
        // default fallback
        let preset_id = 10;
        let preset = { id: 10, name: 'Dine In' };
        try {
          const presetsResp = await fetchPosPresets({ limit: 200 });
          if (presetsResp && presetsResp.result && Array.isArray(presetsResp.result) && presetsResp.result.length > 0) {
            const dine = presetsResp.result.find(p => String(p.name).toLowerCase().includes('dine'));
            const chosen = dine || presetsResp.result[0];
            preset_id = chosen.id;
            preset = { id: chosen.id, name: chosen.name };
          } else {
          }
        } catch (pErr) {
        }
        const created = await createDraftPosOrderOdoo({ sessionId, userId, tableId, preset_id, order_type: route?.params?.order_type || 'DINEIN' });
        if (created && created.result) {
          navigation.navigate('POSProducts', { ...route?.params, orderId: created.result, tableId, preset, preset_id });
        } else {
          throw new Error('Failed to create order');
        }
      }
    } catch (err) {
      // show a simple alert
      try { alert('Could not open/create order for table.'); } catch (e) {}
    } finally {
      setTableLoadingState(tableId, false);
      setGlobalLoading(false);
    }
  };

  // When user opens an order from the Orders list, fetch the order and its lines, log them, then navigate


  useEffect(() => {
    const loadTables = async () => {
      setLoading(true);
      const res = await fetchRestaurantTablesOdoo();
      if (res.result) {
        const t = res.result;
        setTables(t);

        // extract floors from floor_id many2one values, filter out generic company floors
        const floorMap = {};
        t.forEach(item => {
          const f = item.floor_id;
          if (Array.isArray(f) && f.length >= 1) {
            const floorName = f[1] || String(f[0]);
            // Skip floors that look like default company names
            if (!floorName.toLowerCase().includes('my company')) {
              floorMap[f[0]] = floorName;
            }
          }
        });
        const floorList = Object.keys(floorMap).map(id => ({ id: Number(id), name: floorMap[id] }));
        // Add a fallback floor if none found
        if (floorList.length === 0) floorList.push({ id: 0, name: 'Main Floor' });
        setFloors(floorList);
        setSelectedFloorId(floorList[0].id);
        await refreshTablesWithOpenOrders();
      }
      setLoading(false);
    };
    loadTables();
  }, []);



  if (loading) return <Text style={{ textAlign: 'center', marginTop: 40 }}>Loading tables...</Text>;

  // Prepare layout container size based on window width
  const containerPadding = 16;
  const mapWidth = Math.min(windowWidth - 32, 1000);

  // compute scaling factors based on max coordinates
  const floorTables = tables.filter(t => {
    const f = t.floor_id;
    if (!f) return selectedFloorId === 0 || selectedFloorId === null;
    return selectedFloorId === null ? true : Number(f[0]) === Number(selectedFloorId);
  });

  // Determine max extents (position_h + width), (position_v + height)
  let maxX = 0;
  let maxY = 0;
  floorTables.forEach(t => {
    const ph = Number(t.position_h) || 0;
    const pv = Number(t.position_v) || 0;
    const w = Number(t.width) || 100;
    const h = Number(t.height) || 100;
    maxX = Math.max(maxX, ph + w);
    maxY = Math.max(maxY, pv + h);
  });
  if (maxX === 0) maxX = mapWidth;
  if (maxY === 0) maxY = mapWidth * 0.6;
  const scale = mapWidth / maxX;
  const mapHeight = Math.round(maxY * scale);

  return (
    <>
    {globalLoading && (
      <View style={{ position: 'absolute', zIndex: 100, left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={{ marginTop: 16, fontWeight: '700', fontSize: 16, color: '#333' }}>Loading...</Text>
      </View>
    )}
    <ScrollView contentContainerStyle={styles.container}>
      {/* Floor tabs for table selection */}
      <View style={styles.floorTabs}>
            {floors.map(f => (
              <TouchableOpacity
                key={f.id}
                style={[styles.floorTab, selectedFloorId === f.id && styles.floorTabActive]}
                onPress={() => setSelectedFloorId(f.id)}
              >
                <Text style={[styles.floorTabText, selectedFloorId === f.id && styles.floorTabTextActive]}>{f.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.mapContainer, { width: mapWidth, height: mapHeight }]}>
            {floorTables.map(table => {
              const ph = Number(table.position_h) || 0;
              const pv = Number(table.position_v) || 0;
              const w = Number(table.width) || 100;
              const h = Number(table.height) || 100;
              const left = Math.round(ph * scale);
              const top = Math.round(pv * scale);
              const tw = Math.max(40, Math.round(w * scale));
              const th = Math.max(32, Math.round(h * scale));
              const label = table.table_number ? `T ${table.table_number}` : `T ${table.id}`;
              const isOpen = tablesWithOpenOrders.includes(table.id);
              return (
                <TouchableOpacity
                  key={table.id}
                  onPress={() => handleTablePress(table)}
                  style={[styles.tableAbsolute, {
                    left, top, width: tw, height: th, borderRadius: 8
                  }]}
                >
                  <View style={[styles.tableInner, isOpen && { backgroundColor: '#7c3aed', borderColor: '#7c3aed' }]}> 
                    <Text style={[styles.tableText, isOpen && { color: '#fff' }]}>{label}</Text>
                  </View>
                  {tableLoading[table.id] && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="small" color="#000" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
    </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 14,
  },
  headerContainer: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  segmentedControl: { 
    flexDirection: 'row', 
    backgroundColor: '#f4f5f7', 
    borderRadius: 999, 
    padding: 4,
    alignSelf: 'center'
  },
  segmentTab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, marginHorizontal: 4 },
  segmentTabActive: { backgroundColor: '#7c3aed' },
  segmentTabText: { color: '#333', fontWeight: '600' },
  segmentTabTextActive: { color: '#fff', fontWeight: '700' },
  segmentIcon: { marginRight: 6 },
  newOrderBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#06b6d4', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, elevation: 2 },
  newOrderBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  container: { flexGrow: 1, alignItems: 'center', padding: 16 },
  floorTabs: { flexDirection: 'row', marginBottom: 12, marginTop: 20 },
  floorTab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#f0f0f0', marginHorizontal: 6 },
  floorTabActive: { backgroundColor: '#7c3aed' },
  floorTabText: { color: '#333' },
  floorTabTextActive: { color: '#fff' },
  mapContainer: { backgroundColor: '#eee', borderRadius: 6, overflow: 'hidden', position: 'relative' },
  tableAbsolute: { position: 'absolute', elevation: 2 },
  tableInner: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  tableText: { fontSize: 16, color: '#111', fontWeight: '700' },
  seatBadge: {
    position: 'absolute',
    right: 6,
    top: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  seatBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  placeholderContainer: { width: '100%', alignItems: 'center', paddingVertical: 40 },
  placeholderTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  placeholderBtn: { backgroundColor: '#7c3aed', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  placeholderBtnText: { color: '#fff', fontWeight: '700' }
});

export default TablesScreen;
