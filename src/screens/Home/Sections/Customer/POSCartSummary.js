import React, { useState, useCallback, useMemo, memo, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from '@components/containers';
import { NavigationHeader } from '@components/Header';
import { Button } from '@components/common/Button';
import { useProductStore } from '@stores/product';
import { fetchCustomersOdoo } from '@api/services/generalApi';
import { shallow } from 'zustand/shallow';

const errorImage = require('@assets/images/error/error.png');

// Compare only the fields we display — prevents re-render when other items change
const itemEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return a === b;
  return a.id === b.id
    && (a.quantity ?? a.qty) === (b.quantity ?? b.qty)
    && a.price === b.price
    && a.name === b.name;
};

// Each row subscribes to its OWN item from the store with custom equality.
const CartRow = memo(({ itemId }) => {
  const addProduct = useProductStore((s) => s.addProduct);
  const removeProduct = useProductStore((s) => s.removeProduct);

  // Subscribe to just this one item with deep equality on displayed fields
  const item = useProductStore(
    (s) => (s.cartItems[s.currentCustomerId] || []).find((p) => p.id === itemId) || null,
    itemEqual
  );

  if (!item) return null;

  const qty = Number(item.quantity || item.qty || 0);
  const price = Number(item.price || 0);
  const lineTotal = (qty * price).toFixed(2);

  const increase = () => addProduct({ ...item, quantity: qty + 1 });
  const decrease = () => {
    if (qty <= 1) removeProduct(item.id);
    else addProduct({ ...item, quantity: qty - 1 });
  };

  const rawImg = item.imageUrl || item.image_url || null;
  let imageSource = errorImage;
  if (rawImg) {
    if (typeof rawImg === 'string') {
      if (rawImg.startsWith('data:') || rawImg.startsWith('http')) {
        imageSource = { uri: rawImg };
      } else if (rawImg.length > 100) {
        imageSource = { uri: `data:image/png;base64,${rawImg}` };
      }
    } else if (rawImg.uri) {
      imageSource = rawImg;
    }
  }

  return (
    <View style={styles.line}>
      <Image source={imageSource} style={styles.thumb} resizeMode="cover" />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.qty}>{qty} × {price.toFixed(2)}</Text>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity style={styles.qtyBtn} onPress={decrease} activeOpacity={0.6}>
          <Text style={styles.qtyBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.qtyDisplay}>{qty}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={increase} activeOpacity={0.6}>
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.lineTotal}>{lineTotal}</Text>
    </View>
  );
});

const ITEM_HEIGHT = 69;

const POSCartSummary = ({ navigation, route }) => {
  const {
    openingAmount, sessionId, registerId, registerName, userId, userName
  } = route?.params || {};

  const { clearProducts, setCurrentCustomer, loadCustomerCart } = useProductStore();

  // Only subscribe to the list of IDs — changes only when items are added/removed
  const itemIds = useProductStore(
    (s) => (s.cartItems[s.currentCustomerId] || []).map((p) => p.id),
    shallow
  );

  // Subscribe to total separately
  const total = useProductStore(
    (s) => (s.cartItems[s.currentCustomerId] || []).reduce(
      (sum, p) => sum + ((p.price || 0) * (p.quantity || p.qty || 0)), 0
    )
  );

  // For checkout, get full products
  const getProducts = useCallback(
    () => useProductStore.getState().cartItems[useProductStore.getState().currentCustomerId] || [],
    []
  );

  const [customerModal, setCustomerModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const renderItem = useCallback(({ item: id }) => <CartRow itemId={id} />, []);
  const keyExtractor = useCallback((id) => String(id), []);
  const getItemLayout = useCallback((_, index) => ({
    length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index,
  }), []);

  const handleCustomer = async () => {
    setCustomerModal(true);
    setLoadingCustomers(true);
    try {
      const list = await fetchCustomersOdoo({ limit: 50 });
      setCustomers(list);
    } catch (e) {
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    try {
      loadCustomerCart(customer.id, getProducts());
    } catch (e) {
      setCurrentCustomer(customer.id);
    }
    setSelectedCustomer(customer);
    setCustomerModal(false);
  };

  const handleCheckout = useCallback(() => {
    navigation.navigate('POSPayment', {
      openingAmount, sessionId, registerId, registerName, userId, userName,
      products: getProducts(),
    });
  }, [navigation, openingAmount, sessionId, registerId, registerName, userId, userName, getProducts]);

  return (
    <SafeAreaView style={styles.safe}>
      <NavigationHeader title="Cart" onBackPress={() => navigation.goBack()} />
      <View style={styles.container}>
        {itemIds.length > 0 ? (
          <FlatList
            data={itemIds}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            initialNumToRender={15}
            maxToRenderPerBatch={5}
            windowSize={7}
          />
        ) : (
          <Text style={styles.empty}>Cart is empty</Text>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{total.toFixed(2)}</Text>
        </View>

        <View style={styles.checkoutWrap}>
          <Button title="Checkout / Payment" onPress={handleCheckout} />
        </View>

        <Modal visible={customerModal} animationType="slide" transparent>
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              {loadingCustomers ? (
                <ActivityIndicator size="large" color="#444" />
              ) : (
                <FlatList
                  data={customers}
                  keyExtractor={(i) => String(i.id)}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.customerItem} onPress={() => handleSelectCustomer(item)}>
                      <Text style={styles.customerName}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
              <Button title="Close" onPress={() => setCustomerModal(false)} />
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default POSCartSummary;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 12, flex: 1, backgroundColor: '#fff' },
  line: { height: ITEM_HEIGHT, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f0f0f0', flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1 },
  name: { fontWeight: '700', fontSize: 22, color: '#111' },
  qty: { color: '#666', marginTop: 6, fontSize: 16 },
  controls: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  qtyBtn: { backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#e0e0e0' },
  qtyBtnText: { color: '#111', fontWeight: '700', fontSize: 22 },
  qtyDisplay: { color: '#111', marginHorizontal: 8, minWidth: 32, textAlign: 'center', fontWeight: '700', fontSize: 18 },
  lineTotal: { marginLeft: 8, fontWeight: '700', color: '#111' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderColor: '#f0f0f0' },
  totalLabel: { fontWeight: '800', fontSize: 20, color: '#111' },
  totalValue: { fontWeight: '800', fontSize: 24, color: '#111' },
  empty: { color: '#666' },
  checkoutWrap: { marginTop: 12 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '80%', maxHeight: '80%' },
  modalTitle: { fontWeight: '700', fontSize: 18, marginBottom: 12 },
  customerItem: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  customerName: { fontSize: 22, fontWeight: '700' },
  thumb: { width: 48, height: 48, borderRadius: 6, marginRight: 12, backgroundColor: '#fff' },
});
