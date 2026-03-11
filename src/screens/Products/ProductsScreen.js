import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { NavigationHeader } from '@components/Header';
import { ProductsList } from '@components/Product';
import { fetchProductsOdoo } from '@api/services/generalApi';
import { useIsFocused } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { formatData } from '@utils/formatters';
import { OverlayLoader } from '@components/Loader';
import { RoundedContainer, SafeAreaView, SearchContainer } from '@components/containers';
import styles from './styles';
import useDebouncedSearch from '@hooks/useDebouncedSearch';
import Toast from 'react-native-toast-message';
import { useProductStore } from '@stores/product';

const ProductsScreen = ({ navigation, route }) => {
  const rawPosCategoryId = route?.params?.categoryId;
  const posCategoryId = Number(rawPosCategoryId) > 0 ? Number(rawPosCategoryId) : undefined;

  const passedFilteredProductsRaw = route?.params?.filteredProducts;
  const passedFilteredProducts = (Array.isArray(passedFilteredProductsRaw) && passedFilteredProductsRaw.length > 0)
    ? passedFilteredProductsRaw
    : null;

  const { fromCustomerDetails } = route.params || {};
  const isFocused = useIsFocused();
  const { addProduct, setCurrentCustomer } = useProductStore();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState(passedFilteredProducts || []);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [quickProduct, setQuickProduct] = useState(null);
  const [quickQty, setQuickQty] = useState(1);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [backLoading, setBackLoading] = useState(false);
  const fetchRef = useRef(0);

  const handleBack = () => {
    setBackLoading(true);
    setTimeout(() => {
      try { navigation.goBack(); } catch (e) { navigation.navigate('Home'); }
    }, 80);
  };

  const doFetch = async (params) => {
    const token = ++fetchRef.current;
    setLoading(true);
    setFetchError(null);
    try {
      const result = await fetchProductsOdoo(params);
      if (token !== fetchRef.current) return;
      setData(Array.isArray(result) ? result : []);
    } catch (err) {
      if (token !== fetchRef.current) return;
      setFetchError(err?.message || String(err) || 'Unknown error');
      setData([]);
    } finally {
      if (token === fetchRef.current) setLoading(false);
    }
  };

  const { searchText, handleSearchTextChange } = useDebouncedSearch(
    (text) => {
      if (passedFilteredProducts) {
        const term = String(text || '').trim().toLowerCase();
        if (term) {
          setFilteredProducts(passedFilteredProducts.filter(p =>
            String(p.product_name || p.name || '').toLowerCase().includes(term)
          ));
        } else {
          setFilteredProducts(passedFilteredProducts);
        }
      } else {
        doFetch({ searchText: text, posCategoryId });
      }
    },
    500
  );

  useEffect(() => {
    if (passedFilteredProducts) {
      const term = String(searchText || '').trim().toLowerCase();
      if (term) {
        setFilteredProducts(passedFilteredProducts.filter(p =>
          String(p.product_name || p.name || '').toLowerCase().includes(term)
        ));
      } else {
        setFilteredProducts(passedFilteredProducts);
      }
      return;
    }
    if (!isFocused) return;
    doFetch({ searchText, posCategoryId });
  }, [isFocused, posCategoryId, passedFilteredProducts]);

  useEffect(() => {
    if (fromCustomerDetails || route?.params?.fromPOS) {
      try { setCurrentCustomer('pos_guest'); } catch (e) {}
    }
  }, [route?.params?.fromPOS, fromCustomerDetails]);

  const productsToShow = passedFilteredProducts ? filteredProducts : data;

  const renderItem = ({ item }) => {
    if (item.empty) {
      return <View style={[styles.itemStyle, styles.itemInvisible]} />;
    }
    return (
      <ProductsList
        item={item}
        onPress={() => navigation.navigate('ProductDetail', { detail: item, fromCustomerDetails, fromPOS: route?.params?.fromPOS })}
        showQuickAdd={!!route?.params?.fromPOS}
        onQuickAdd={() => {
          setQuickProduct(item);
          setQuickQty(1);
          setQuickAddVisible(true);
        }}
      />
    );
  };

  const renderBody = () => {
    if (loading) return null;

    if (fetchError) {
      return (
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
          <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 14, marginBottom: 8 }}>
            Failed to load products
          </Text>
          <Text style={{ color: '#374151', fontSize: 12, marginBottom: 16, lineHeight: 18 }}>
            {fetchError}
          </Text>
          <TouchableOpacity
            onPress={() => doFetch({ searchText, posCategoryId })}
            style={{ backgroundColor: '#111827', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, alignSelf: 'flex-start' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    if (productsToShow.length === 0) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
          <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
            No products found{posCategoryId ? ` for category #${posCategoryId}` : ''}.
          </Text>
          {!passedFilteredProducts && (
            <TouchableOpacity
              onPress={() => doFetch({ searchText, posCategoryId })}
              style={{ backgroundColor: '#111827', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <FlashList
        data={formatData(productsToShow, 3)}
        numColumns={3}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ padding: 10, paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={100}
      />
    );
  };

  return (
    <SafeAreaView>
      <NavigationHeader
        title={route?.params?.categoryName ? `${route.params.categoryName}` : 'Products'}
        onBackPress={handleBack}
      />
      <SearchContainer
        placeholder="Search Products"
        onChangeText={handleSearchTextChange}
        value={searchText}
      />
      <RoundedContainer>
        {renderBody()}
      </RoundedContainer>
      <OverlayLoader visible={loading || backLoading} />

      <Modal visible={quickAddVisible} transparent animationType="fade" onRequestClose={() => setQuickAddVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setQuickAddVisible(false)}>
          <Pressable style={{ width: '88%', backgroundColor: '#fff', borderRadius: 12, padding: 16 }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ fontSize: 16, fontWeight: '800', marginBottom: 8 }}>Add Item</Text>
            <Text style={{ fontSize: 14, marginBottom: 12, color: '#374151' }}>{quickProduct?.product_name || quickProduct?.name || 'Product'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>Quantity</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPressIn={() => setQuickQty(q => Math.max(1, q - 1))} style={{ backgroundColor: '#f3f4f6', width: 56, height: 56, borderRadius: 28, marginRight: 8, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 28, fontWeight: '800' }}>-</Text>
                </TouchableOpacity>
                <Text style={{ minWidth: 32, textAlign: 'center', fontWeight: '700', fontSize: 16 }}>{quickQty}</Text>
                <TouchableOpacity onPressIn={() => setQuickQty(q => q + 1)} style={{ backgroundColor: '#f3f4f6', width: 56, height: 56, borderRadius: 28, marginLeft: 8, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 28, fontWeight: '800' }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setQuickAddVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#f3f4f6', marginRight: 10 }}>
                <Text style={{ fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                try {
                  const product = {
                    id: quickProduct.id,
                    name: quickProduct.product_name || quickProduct.name,
                    price: quickProduct.price || quickProduct.list_price || 0,
                    quantity: quickQty,
                  };
                  addProduct(product);
                  Toast.show({ type: 'success', text1: 'Added', text2: `${product.name} × ${quickQty}` });
                  setQuickAddVisible(false);
                  setConfirmVisible(true);
                  setTimeout(() => {
                    setConfirmVisible(false);
                    setQuickProduct(null);
                    setQuickQty(1);
                  }, 900);
                } catch (e) {
                  setQuickAddVisible(false);
                }
              }} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#111827' }}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Add</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable style={{ width: '76%', backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', marginBottom: 6 }}>Added to Cart</Text>
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 12 }}>{quickProduct?.product_name || quickProduct?.name || 'Product'} × {quickQty}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default ProductsScreen;
