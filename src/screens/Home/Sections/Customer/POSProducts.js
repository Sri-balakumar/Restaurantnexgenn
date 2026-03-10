import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, Modal, Pressable, StyleSheet as RNStyleSheet, InteractionManager } from 'react-native';
import { NavigationHeader } from '@components/Header';
import { ProductsList } from '@components/Product';
import { fetchPosPresets, addLineToOrderOdoo, updateOrderLineOdoo, removeOrderLineOdoo, fetchPosOrderById, fetchOrderLinesByIds, fetchPosCategoriesOdoo, fetchProductCategoriesOdoo, preloadAllProducts } from '@api/services/generalApi';
import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { formatData } from '@utils/formatters';
import { formatCurrency } from '@utils/formatters/currency';
import { OverlayLoader } from '@components/Loader';
import { RoundedContainer, SafeAreaView, SearchContainer } from '@components/containers';
import { COLORS } from '@constants/theme';
import styles from './styles';
import { EmptyState } from '@components/common/empty';
import { useProductStore } from '@stores/product';
import Toast from 'react-native-toast-message';
import { Button } from '@components/common/Button';
import useKitchenTickets from '@stores/kitchen/ticketsStore';

// Static styles — created once, never re-allocated
const localStyles = RNStyleSheet.create({
  qtyBtn: {
    backgroundColor: '#f0f0f0',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qtyText: { fontSize: 24, fontWeight: '700', color: '#111' },
  qtyDisplay: { minWidth: 32, textAlign: 'center', fontWeight: '700', fontSize: 18, marginHorizontal: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '88%', backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, marginBottom: 12, color: '#374151' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyLabel: { fontSize: 16, fontWeight: '700' },
  qtyButtons: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 12 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#f3f4f6', marginRight: 10 },
  cancelText: { fontWeight: '700' },
  addBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#111827' },
  addBtnText: { color: '#fff', fontWeight: '800' },
  confirmOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  confirmChip: { backgroundColor: '#111827', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20 },
  confirmTitle: { fontSize: 15, fontWeight: '800', color: '#fff', textAlign: 'center' },
  confirmSub: { fontSize: 13, color: '#d1d5db', textAlign: 'center', marginTop: 4 },
  catPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  catText: { fontWeight: '700' },
  catBar: { paddingHorizontal: 12, paddingVertical: 8 },
  catScroll: { paddingVertical: 6 },
  productsList: { padding: 10, paddingBottom: 50 },
  registerPanel: { flex: 1, backgroundColor: '#fff', padding: 12 },
  registerTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  orderLineRow: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderLineName: { fontWeight: '700' },
  orderLinePrice: { color: '#666' },
  orderLineControls: { flexDirection: 'row', alignItems: 'center' },
  orderLineBtn: { backgroundColor: '#f3f4f6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginHorizontal: 6, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  orderLineBtnText: { fontSize: 24, fontWeight: '800' },
  orderLineQty: { minWidth: 28, textAlign: 'center', fontWeight: '700', fontSize: 16 },
  orderLineTotal: { fontWeight: '800', marginLeft: 12 },
  totalLabel: { fontSize: 14, color: '#444' },
  totalValue: { fontSize: 22, fontWeight: '800' },
  chipBtn: { backgroundColor: '#f3f4f6', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginRight: 10, marginBottom: 10, minWidth: 110, justifyContent: 'center', alignItems: 'center' },
  chipText: { fontWeight: '800', fontSize: 15 },
  presetSheet: { backgroundColor: '#fff', padding: 12, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  presetTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  presetItem: { padding: 12, borderRadius: 8, marginBottom: 8 },
  presetText: { fontSize: 15, fontWeight: '700' },
  presetCancel: { padding: 12, marginTop: 6, borderRadius: 8, backgroundColor: '#f3f4f6' },
  presetCancelText: { textAlign: 'center', fontWeight: '700' },
  invoiceBtn: { backgroundColor: '#f3f4f6', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8, alignItems: 'center' },
  invoiceBtnText: { fontWeight: '800' },
  addProductsBtn: { paddingVertical: 8 },
});

const POSProducts = ({ navigation, route }) => {
  const {
    openingAmount, sessionId, registerId, registerName, userId, userName
  } = route?.params || {};

  // POS category state
  const [posCategories, setPosCategories] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [selectedPosCategoryId, setSelectedPosCategoryId] = useState(null);
  const [posFilteredProducts, setPosFilteredProducts] = useState(null);

  // Store
  const { addProduct, setCurrentCustomer, clearProducts, removeProduct } = useProductStore();
  const [loadedOrderLines, setLoadedOrderLines] = useState([]);
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showProducts, setShowProducts] = useState(false);

  // Quick Add state
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [quickProduct, setQuickProduct] = useState(null);
  const [quickQty, setQuickQty] = useState(1);
  const [orderInfo, setOrderInfo] = useState(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [confirmQty, setConfirmQty] = useState(1);
  const [backLoading, setBackLoading] = useState(false);

  // Search: input value updates instantly, filter value is debounced so it doesn't block touches
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef(null);
  const handleSearchChange = useCallback((text) => {
    setSearchText(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(text), 300);
  }, []);

  const setSnapshot = useKitchenTickets((s) => s.setSnapshot);

  // Cache all products
  const [allCachedProducts, setAllCachedProducts] = useState(null);

  const handleMainBack = useCallback(() => {
    setBackLoading(true);
    setTimeout(() => {
      try { navigation.goBack(); } catch (e) { navigation.navigate('Home'); }
    }, 80);
  }, [navigation]);

  const handleCloseProducts = useCallback(() => {
    setShowProducts(false);
  }, []);

  // Map pos.order.line -> product format
  const mapLineToProduct = useCallback((line) => {
    const productId = Array.isArray(line.product_id) ? line.product_id[0] : line.product_id;
    const productName = Array.isArray(line.product_id) ? line.product_id[1] : (line.full_product_name || line.name || 'Product');
    const qty = Number(line.qty || 1);
    const unitPrice = Number(line.price_unit || 0);
    const subtotalIncl = Number(line.price_subtotal_incl ?? line.price_subtotal ?? (qty * unitPrice));
    return {
      id: `odoo_line_${line.id}`,
      remoteId: productId,
      name: productName,
      price: Number(line.price_unit || line.price_subtotal_incl || 0),
      price_unit: Number(line.price_unit || line.price_subtotal_incl || 0),
      quantity: qty,
      qty,
      price_subtotal: Number(line.price_subtotal ?? (qty * unitPrice)),
      price_subtotal_incl: subtotalIncl,
    };
  }, []);

  // Refresh order lines from server
  const refreshServerOrder = useCallback(async (orderId) => {
    if (!orderId) return;
    try {
      const orderResp = await fetchPosOrderById(orderId);
      const orderResult = orderResp?.result ?? null;
      const CLOSED_STATES = ['done', 'receipt', 'paid', 'invoiced', 'posted', 'cancel'];
      if (orderResult && CLOSED_STATES.includes(String(orderResult.state))) {
        try { clearProducts(); } catch (e) {}
        setLoadedOrderLines([]);
        setOrderInfo(orderResult);
        return;
      }
      const lineIds = orderResult?.lines ?? [];
      const cartOwner = `order_${orderId}`;
      setCurrentCustomer(cartOwner);
      if (lineIds.length > 0) {
        const linesResp = await fetchOrderLinesByIds(lineIds);
        const lines = linesResp?.result ?? [];
        clearProducts();
        lines.forEach(line => addProduct(mapLineToProduct(line)));
        setLoadedOrderLines(lines);
      } else {
        clearProducts();
        setLoadedOrderLines([]);
      }
      setOrderInfo(orderResult);
    } catch (err) {}
  }, [clearProducts, setCurrentCustomer, addProduct, mapLineToProduct]);

  // Set cart owner on focus
  useFocusEffect(
    useCallback(() => {
      const orderId = route?.params?.orderId;
      if (orderId) {
        try { setCurrentCustomer(`order_${orderId}`); } catch (e) {}
        (async () => { try { await refreshServerOrder(orderId); } catch (e) {} })();
      } else {
        try { setCurrentCustomer('pos_guest'); } catch (e) {}
      }
    }, [route?.params?.orderId, setCurrentCustomer, refreshServerOrder])
  );

  // Load presets + order lines on mount
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetchPosPresets();
        if (resp?.result) {
          setPresets(resp.result);
          const dineIn = resp.result.find(p => String(p.name).toLowerCase().includes('dine'));
          setSelectedPreset(dineIn || resp.result[0] || null);
        }
      } catch (err) {}
    })();
    const { orderId, orderLines } = route?.params || {};
    if (orderLines && Array.isArray(orderLines) && orderLines.length > 0) {
      const cartOwner = `order_${orderId}`;
      setCurrentCustomer(cartOwner);
      clearProducts();
      orderLines.forEach(line => addProduct(mapLineToProduct(line)));
      setLoadedOrderLines(orderLines);
    }
  }, []);

  // Load categories on mount
  useEffect(() => {
    (async () => {
      try {
        const [posResp, prodResp] = await Promise.all([fetchPosCategoriesOdoo(), fetchProductCategoriesOdoo()]);
        const posListRaw = Array.isArray(posResp) ? posResp : (posResp?.result ?? []);
        const excludeNames = ['food', 'drinks'];
        const filtered = posListRaw.filter(c => {
          const name = c?.name || (Array.isArray(c) ? c[1] : '');
          if (!name) return true;
          const lower = String(name).toLowerCase();
          return !excludeNames.some(e => lower === e || lower.includes(e));
        });
        // Deduplicate by name
        const seen = new Set();
        const dedupReversed = [];
        for (let i = filtered.length - 1; i >= 0; i--) {
          const c = filtered[i];
          const name = c?.name || (Array.isArray(c) ? c[1] : '');
          const key = name ? String(name).trim().toLowerCase() : `__idx_${i}`;
          if (!seen.has(key)) { seen.add(key); dedupReversed.push(c); }
        }
        setPosCategories(dedupReversed.reverse());
        setProductCategories(Array.isArray(prodResp) ? prodResp : (prodResp?.result ?? []));
      } catch (e) {}
    })();
  }, []);

  // Cache all products when modal opens
  useEffect(() => {
    if (!showProducts) return;
    let mounted = true;
    (async () => {
      try {
        const all = await preloadAllProducts();
        if (mounted) setAllCachedProducts(all);
      } catch (err) {}
    })();
    return () => { mounted = false; };
  }, [showProducts]);

  // Filter products by selected category — instant, no network
  useEffect(() => {
    if (!showProducts) return;
    if (!selectedPosCategoryId) { setPosFilteredProducts(null); return; }
    if (!allCachedProducts) return;
    const catId = Number(selectedPosCategoryId);
    const filtered = allCachedProducts.filter(p => {
      if (Array.isArray(p.pos_categ_ids) && p.pos_categ_ids.length > 0) return p.pos_categ_ids.includes(catId);
      if (Array.isArray(p.pos_categ_id)) return p.pos_categ_id[0] === catId;
      return p.pos_categ_id === catId;
    });
    setPosFilteredProducts(filtered);
  }, [selectedPosCategoryId, showProducts, allCachedProducts]);

  // Products to display — uses debounced search so filtering doesn't block touch events
  const productsToShow = useMemo(() => {
    const base = posFilteredProducts !== null ? posFilteredProducts : (allCachedProducts || []);
    if (debouncedSearch && String(debouncedSearch).trim()) {
      const q = String(debouncedSearch).toLowerCase();
      return Array.isArray(base) ? base.filter(p => {
        const name = String(p.product_name || p.name || '').toLowerCase();
        return name.includes(q);
      }) : base;
    }
    return base;
  }, [posFilteredProducts, allCachedProducts, debouncedSearch]);

  const handleAdd = useCallback((p, qtyOverride = 1) => {
    const product = {
      id: p.id,
      name: p.product_name || p.name,
      price: p.price || p.list_price || 0,
      quantity: qtyOverride,
      imageUrl: p.imageUrl || p.image_url || p.image || '',
    };
    // Always add to local cart immediately (optimistic)
    addProduct(product);
    const orderId = route?.params?.orderId;
    if (orderId) {
      // Fire-and-forget network call — no refreshServerOrder to avoid heavy re-renders
      addLineToOrderOdoo({ orderId, productId: p.id, qty: qtyOverride, price_unit: product.price, name: product.name })
        .catch(() => Toast.show({ type: 'error', text1: 'Odoo Error', text2: 'Failed to sync with server' }));
    }
  }, [route?.params?.orderId, addProduct]);

  const openQuickAdd = useCallback((p) => {
    setConfirmVisible(false);
    setQuickProduct(p);
    setQuickQty(1);
    setQuickAddVisible(true);
  }, []);

  const confirmQuickAdd = useCallback(() => {
    if (!quickProduct) return;
    const addedName = quickProduct.product_name || quickProduct.name || 'Product';
    const addedQty = quickQty;
    const prodToAdd = quickProduct;
    setQuickAddVisible(false);
    setConfirmName(addedName);
    setConfirmQty(addedQty);
    setConfirmVisible(true);
    setQuickProduct(null);
    setQuickQty(1);
    InteractionManager.runAfterInteractions(() => handleAdd(prodToAdd, addedQty));
    setTimeout(() => setConfirmVisible(false), 1000);
  }, [quickProduct, quickQty, handleAdd]);

  const handleViewCart = useCallback(() => {
    // Sync with server before showing cart
    const orderId = route?.params?.orderId;
    if (orderId) {
      refreshServerOrder(orderId).catch(() => {});
    }
    navigation.navigate('POSCartSummary', { openingAmount, sessionId, registerId, registerName, userId, userName });
  }, [navigation, openingAmount, sessionId, registerId, registerName, userId, userName, route?.params?.orderId, refreshServerOrder]);

  const renderItem = useCallback(({ item }) => {
    if (item.empty) return <View style={[styles.itemStyle, styles.itemInvisible]} />;
    return (
      <ProductsList
        item={item}
        onPress={() => {}}
        showQuickAdd
        onQuickAdd={openQuickAdd}
      />
    );
  }, [openQuickAdd]);

  const renderEmptyState = () => (
    <EmptyState imageSource={require('@assets/images/EmptyData/empty_data.png')} message={''} />
  );

  const renderOrderLine = ({ item }) => {
    const qty = Number(item.qty ?? item.quantity ?? 1);
    const unit = Number(item.price_unit ?? item.price ?? 0);
    const subtotal = (typeof item.price_subtotal_incl === 'number' && !isNaN(item.price_subtotal_incl))
      ? item.price_subtotal_incl
      : (typeof item.price_subtotal === 'number' && !isNaN(item.price_subtotal) ? item.price_subtotal : qty * unit);

    const handleIncrease = async () => {
      const newQty = qty + 1;
      const orderId = route?.params?.orderId;
      addProduct({ ...item, quantity: newQty, qty: newQty });
      if (orderId && String(item.id).startsWith('odoo_line_')) {
        const lineId = Number(String(item.id).replace('odoo_line_', ''));
        try {
          await updateOrderLineOdoo({ lineId, qty: newQty, price_unit: item.price_unit ?? item.price, orderId });
        } catch (e) {
          Toast.show({ type: 'error', text1: 'Odoo Error', text2: 'Failed to update quantity' });
          try { await refreshServerOrder(orderId); } catch (_) {}
        }
      } else if (orderId && item.remoteId) {
        try {
          await addLineToOrderOdoo({ orderId, productId: item.remoteId || item.id, qty: 1, price_unit: item.price_unit ?? item.price, name: item.name });
        } catch (e) {
          Toast.show({ type: 'error', text1: 'Odoo Error', text2: 'Failed to add product to order' });
          try { await refreshServerOrder(orderId); } catch (_) {}
        }
      }
    };

    const handleDecrease = async () => {
      const orderId = route?.params?.orderId;
      if (qty <= 1) {
        removeProduct(item.id);
        if (orderId && String(item.id).startsWith('odoo_line_')) {
          const lineId = Number(String(item.id).replace('odoo_line_', ''));
          try { await removeOrderLineOdoo({ lineId, orderId }); } catch (e) {}
          try { await refreshServerOrder(orderId); } catch (_) {}
        } else if (orderId) {
          try { await refreshServerOrder(orderId); } catch (_) {}
        }
      } else {
        const newQty = qty - 1;
        addProduct({ ...item, quantity: newQty, qty: newQty });
        if (orderId && String(item.id).startsWith('odoo_line_')) {
          const lineId = Number(String(item.id).replace('odoo_line_', ''));
          try {
            await updateOrderLineOdoo({ lineId, qty: newQty, price_unit: item.price_unit ?? item.price, orderId });
          } catch (e) {
            Toast.show({ type: 'error', text1: 'Odoo Error', text2: 'Failed to update quantity' });
            try { await refreshServerOrder(orderId); } catch (_) {}
          }
        }
      }
    };

    return (
      <View style={localStyles.orderLineRow}>
        <View style={{ flex: 1 }}>
          <Text style={localStyles.orderLineName}>{item.name || item.product_id?.[1] || `Line ${item.id}`}</Text>
          <Text style={localStyles.orderLinePrice}>{formatCurrency(unit).replace(/^\w+\s/, '')} each</Text>
        </View>
        <View style={localStyles.orderLineControls}>
          <TouchableOpacity onPress={handleDecrease} style={localStyles.orderLineBtn}>
            <Text style={localStyles.orderLineBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={localStyles.orderLineQty}>{qty}</Text>
          <TouchableOpacity onPress={handleIncrease} style={localStyles.orderLineBtn}>
            <Text style={localStyles.orderLineBtnText}>+</Text>
          </TouchableOpacity>
          <Text style={localStyles.orderLineTotal}>{formatCurrency(subtotal)}</Text>
        </View>
      </View>
    );
  };

  const renderRegisterPanel = () => {
    const cartItems = useProductStore((s) => s.getCurrentCart()) || [];
    const total = cartItems.reduce((s, it) => {
      const itQty = Number(it.quantity ?? it.qty ?? 1);
      const itUnit = Number(it.price_unit ?? it.price ?? 0);
      const lineTotal = (typeof it.price_subtotal_incl === 'number' && !isNaN(it.price_subtotal_incl))
        ? it.price_subtotal_incl
        : (typeof it.price_subtotal === 'number' && !isNaN(it.price_subtotal) ? it.price_subtotal : itQty * itUnit);
      return s + lineTotal;
    }, 0);

    return (
      <View style={localStyles.registerPanel}>
        <Text style={localStyles.registerTitle}>{route?.params?.registerName || 'Register'}</Text>
        <View style={{ flex: 1 }}>
          <FlatList
            data={cartItems}
            keyExtractor={item => String(item.id)}
            renderItem={renderOrderLine}
            ListEmptyComponent={<Text style={{ color: '#666' }}>No items</Text>}
            contentContainerStyle={{ paddingBottom: 6 }}
          />
        </View>

        <View style={{ marginTop: 8 }}>
          <Text style={localStyles.totalLabel}>Total</Text>
          <Text style={localStyles.totalValue}>{formatCurrency(total)}</Text>
        </View>

        <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
          <TouchableOpacity style={localStyles.chipBtn}>
            <Text style={localStyles.chipText}>{route?.params?.userName || 'John Doe'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPresetModal(true)} style={localStyles.chipBtn}>
            <Text style={localStyles.chipText}>{selectedPreset ? selectedPreset.name : 'Order Type'}</Text>
          </TouchableOpacity>

          <Modal visible={showPresetModal} transparent animationType="fade">
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setShowPresetModal(false)}>
              <View style={localStyles.presetSheet}>
                <Text style={localStyles.presetTitle}>Select Order Type</Text>
                <ScrollView style={{ maxHeight: 240 }}>
                  {presets && presets.length > 0 ? (
                    presets.map(preset => (
                      <TouchableOpacity key={preset.id} onPress={() => { setSelectedPreset(preset); setShowPresetModal(false); }}
                        style={[localStyles.presetItem, { backgroundColor: selectedPreset?.id === preset.id ? '#e6f6ff' : '#fff' }]}>
                        <Text style={localStyles.presetText}>{preset.name}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    ['Dine In', 'Takeaway', 'Delivery'].map((name, idx) => (
                      <TouchableOpacity key={`builtin_${idx}`} onPress={() => { setSelectedPreset({ id: `builtin_${idx}`, name }); setShowPresetModal(false); }}
                        style={[localStyles.presetItem, { backgroundColor: selectedPreset?.name === name ? '#e6f6ff' : '#fff' }]}>
                        <Text style={localStyles.presetText}>{name}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
                <TouchableOpacity onPress={() => setShowPresetModal(false)} style={localStyles.presetCancel}>
                  <Text style={localStyles.presetCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => {
              const items = cartItems.map(it => {
                const qty = Number(it.quantity ?? it.qty ?? 1);
                const unit = Number(it.price_unit ?? it.price ?? 0);
                const lineTotal = (typeof it.price_subtotal_incl === 'number') ? it.price_subtotal_incl : qty * unit;
                return { id: String(it.id), qty, name: it.name || 'Product', unit, subtotal: lineTotal };
              });
              if (!items.length) { Toast.show({ type: 'error', text1: 'No items', text2: 'No items to bill.' }); return; }
              const subtotal = items.reduce((s, it) => s + (it.subtotal || 0), 0);
              navigation.navigate('CreateInvoicePreview', {
                items, subtotal, tax: 0, service: 0, total: subtotal,
                orderId: null, invoiceNumber: null, tableName: orderInfo?.table_id?.[1] || '',
              });
            }} style={localStyles.invoiceBtn}>
              <Text style={localStyles.invoiceBtnText}>Create Invoice</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              const orderId = route?.params?.orderId || orderInfo?.id;
              navigation.navigate('KitchenBillPreview', {
                orderId, orderName: orderInfo?.name || '', tableName: orderInfo?.table_id?.[1] || '',
                serverName: route?.params?.userName || '', items: cartItems,
                cartOwner: route?.params?.cartOwner || (orderId ? `order_${orderId}` : 'pos_guest'),
                order_type: route?.params?.order_type,
              });
            }} style={localStyles.invoiceBtn}>
              <Text style={localStyles.invoiceBtnText}>Kitchen Bill</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderProducts = () => {
    if ((!productsToShow || productsToShow.length === 0) && !(!allCachedProducts)) return renderEmptyState();
    return (
      <FlashList
        data={formatData(productsToShow, 3)}
        numColumns={3}
        renderItem={renderItem}
        keyExtractor={(item, index) => String(item.id || index)}
        contentContainerStyle={localStyles.productsList}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.2}
        estimatedItemSize={150}
        drawDistance={300}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <NavigationHeader title="Register" onBackPress={handleMainBack} />
      <OverlayLoader visible={backLoading} />
      <View style={{ flex: 1, paddingHorizontal: 12 }}>
        {renderRegisterPanel()}

        <View style={localStyles.addProductsBtn}>
          <Button title="Add Products" onPress={() => setShowProducts(true)} />
        </View>

        <Modal visible={showProducts} animationType="slide" onRequestClose={() => setShowProducts(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
            <NavigationHeader title="Products" onBackPress={handleCloseProducts} />
            <SearchContainer placeholder="Search Products" onChangeText={handleSearchChange} value={searchText} />

            <View style={localStyles.catBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={localStyles.catScroll} keyboardShouldPersistTaps="handled">
                <TouchableOpacity onPress={() => setSelectedPosCategoryId(null)} style={{ marginRight: 8 }}>
                  <View style={[localStyles.catPill, { backgroundColor: selectedPosCategoryId === null ? (COLORS.primaryThemeColor || '#7c3aed') : '#f3f4f6' }]}>
                    <Text style={[localStyles.catText, { color: selectedPosCategoryId === null ? '#fff' : '#111' }]}>Show All</Text>
                  </View>
                </TouchableOpacity>
                {posCategories.length > 0 ? (
                  posCategories.map(cat => {
                    const id = cat.id || (Array.isArray(cat) ? cat[0] : null);
                    const name = cat.name || (Array.isArray(cat) ? cat[1] : '');
                    const selected = Number(id) === Number(selectedPosCategoryId);
                    return (
                      <TouchableOpacity key={String(id)} onPress={() => setSelectedPosCategoryId(id)} style={{ marginRight: 8 }}>
                        <View style={[localStyles.catPill, { backgroundColor: selected ? (COLORS.primaryThemeColor || '#7c3aed') : '#f3f4f6' }]}>
                          <Text style={[localStyles.catText, { color: selected ? '#fff' : '#111' }]}>{name}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={{ color: '#666' }}>No categories</Text>
                )}
              </ScrollView>
            </View>

            <RoundedContainer style={{ flex: 1 }}>
              {renderProducts()}
            </RoundedContainer>

            {/* Quick Add Modal */}
            <Modal visible={quickAddVisible} transparent animationType="none" onRequestClose={() => setQuickAddVisible(false)}>
              <Pressable style={localStyles.modalBackdrop} onPress={() => setQuickAddVisible(false)}>
                <Pressable style={localStyles.modalCard} onPress={(e) => e.stopPropagation()}>
                  <Text style={localStyles.modalTitle}>Add Item</Text>
                  <Text style={localStyles.modalSubtitle}>{quickProduct?.product_name || quickProduct?.name || 'Product'}</Text>
                  <View style={localStyles.qtyRow}>
                    <Text style={localStyles.qtyLabel}>Quantity</Text>
                    <View style={localStyles.qtyButtons}>
                      <TouchableOpacity onPress={() => setQuickQty(prev => Math.max(1, prev - 1))} style={localStyles.qtyBtn} activeOpacity={0.6}>
                        <Text style={localStyles.qtyText}>-</Text>
                      </TouchableOpacity>
                      <Text style={localStyles.qtyDisplay}>{quickQty}</Text>
                      <TouchableOpacity onPress={() => setQuickQty(prev => prev + 1)} style={localStyles.qtyBtn} activeOpacity={0.6}>
                        <Text style={localStyles.qtyText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={localStyles.divider} />
                  <View style={localStyles.actionRow}>
                    <TouchableOpacity onPress={() => setQuickAddVisible(false)} style={localStyles.cancelBtn}>
                      <Text style={localStyles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={confirmQuickAdd} style={[localStyles.addBtn, { backgroundColor: COLORS.primary || '#111827' }]}>
                      <Text style={localStyles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>

            {/* Confirmation chip — non-blocking */}
            {confirmVisible && (
              <View pointerEvents="none" style={localStyles.confirmOverlay}>
                <View style={localStyles.confirmChip}>
                  <Text style={localStyles.confirmTitle}>Added to Cart</Text>
                  <Text style={localStyles.confirmSub}>{confirmName} × {confirmQty}</Text>
                </View>
              </View>
            )}
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default POSProducts;
