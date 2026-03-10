import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { NavigationHeader } from '@components/Header';
import { ProductsList } from '@components/Product';
// ⬇️ CHANGE: use Odoo version instead of old backend
import { fetchProductsOdoo, fetchProductCategoriesOdoo } from '@api/services/generalApi';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { formatData } from '@utils/formatters';
import { OverlayLoader } from '@components/Loader';
import { RoundedContainer, SafeAreaView, SearchContainer } from '@components/containers';
import styles from './styles';
import { EmptyState } from '@components/common/empty';
import useDataFetching from '@hooks/useDataFetching';
import useDebouncedSearch from '@hooks/useDebouncedSearch';
import Toast from 'react-native-toast-message';
import { useProductStore } from '@stores/product';

const ProductsScreen = ({ navigation, route }) => {
  // Only use a valid numeric pos.categoryId
  const rawPosCategoryId = route?.params?.categoryId;
  const posCategoryId = Number(rawPosCategoryId) > 0 ? Number(rawPosCategoryId) : undefined;

  // If filteredProducts are passed from HomeScreen, use them directly
  const passedFilteredProducts = route?.params?.filteredProducts;

  // State to hold all product categories for mapping
  const [productCategories, setProductCategories] = useState([]);
  const [mappedProductCategoryId, setMappedProductCategoryId] = useState(undefined);
  const [filteredProducts, setFilteredProducts] = useState(passedFilteredProducts || []);

  // Fetch all product categories on mount
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const cats = await fetchProductCategoriesOdoo();
        setProductCategories(cats);
      } catch (e) {
        // silently ignore
      }
    };
    fetchCats();
  }, []);

  // Map pos.category to product.category by name
  useEffect(() => {
    // Assume pos.category name is passed in route.params.categoryName
    const posCategoryName = route?.params?.categoryName;
    let mappedId = undefined;
    // Manual mapping for known mismatches
    const manualCategoryMap = {
      'APPETIZERS': 'STARTER',
      // Add more mappings as needed
    };
    let effectiveCategoryName = posCategoryName;
    if (posCategoryName && manualCategoryMap[posCategoryName.toUpperCase()]) {
      effectiveCategoryName = manualCategoryMap[posCategoryName.toUpperCase()];
    }
    if (effectiveCategoryName && productCategories.length > 0) {
      // Try exact (case-insensitive) match
      let match = productCategories.find(cat => (cat.name || '').toLowerCase() === effectiveCategoryName.toLowerCase());
      // If no exact match, try partial/fuzzy match
      if (!match) {
        match = productCategories.find(cat =>
          (cat.name || '').toLowerCase().includes(effectiveCategoryName.toLowerCase()) ||
          effectiveCategoryName.toLowerCase().includes((cat.name || '').toLowerCase())
        );
        if (match) {
        }
      }
      if (match) {
        mappedId = match.id;
        if (!match.name.toLowerCase() === effectiveCategoryName.toLowerCase()) {
        }
      } else {
        // no matching product category found
      }
    } else if (!effectiveCategoryName) {
      // no categoryName provided
    }
    setMappedProductCategoryId(mappedId);
  }, [route?.params?.categoryName, productCategories, posCategoryId]);
  const { fromCustomerDetails } = route.params || {};

  const isFocused = useIsFocused();
  const { addProduct, setCurrentCustomer } = useProductStore();
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [quickProduct, setQuickProduct] = useState(null);
  const [quickQty, setQuickQty] = useState(1);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [backLoading, setBackLoading] = useState(false);

  const handleBack = () => {
    setBackLoading(true);
    setTimeout(() => {
      try { navigation.goBack(); } catch (e) { navigation.navigate('Home'); }
    }, 80);
  };
  // ⬇️ CHANGE: hook now uses fetchProductsOdoo
  const { data, loading, fetchData, fetchMoreData } = useDataFetching(fetchProductsOdoo);

  const { searchText, handleSearchTextChange } = useDebouncedSearch(
    (text) => {
      // If we have passed products, filter them client-side
      if (passedFilteredProducts) {
        if (text && String(text).trim()) {
          const filtered = passedFilteredProducts.filter(p => {
            const name = String(p.product_name || p.name || '').toLowerCase();
            return name.includes(String(text).toLowerCase());
          });
          setFilteredProducts(filtered);
        } else {
          setFilteredProducts(passedFilteredProducts);
        }
      } else {
        fetchData({ searchText: text, categoryId: mappedProductCategoryId });
      }
    },
    500
  );
  // If filteredProducts are passed, use them; otherwise, fetch as before
  useEffect(() => {
    if (passedFilteredProducts) {
      // Apply current search text filter if any
      if (searchText && String(searchText).trim()) {
        const filtered = passedFilteredProducts.filter(p => {
          const name = String(p.product_name || p.name || '').toLowerCase();
          return name.includes(String(searchText).toLowerCase());
        });
        setFilteredProducts(filtered);
      } else {
        setFilteredProducts(passedFilteredProducts);
      }
    } else {
      if (isFocused) {
        if (mappedProductCategoryId) {
          fetchData({ searchText, categoryId: mappedProductCategoryId });
        } else {
          // If no mapping, clear products (or show empty)
          fetchData({ searchText, categoryId: -1 }); // -1 will not match any product.category
        }
      }
    }
  }, [isFocused, mappedProductCategoryId, searchText, passedFilteredProducts]);

  // If opened from POS, ensure cart owner is the POS guest so quick-add works
  useEffect(() => {
    if (fromCustomerDetails || route?.params?.fromPOS) {
      try { setCurrentCustomer('pos_guest'); } catch (e) { /* ignore */ }
    }
  }, [route?.params?.fromPOS, fromCustomerDetails]);

  const handleLoadMore = () => {
    fetchMoreData({ searchText, categoryId: mappedProductCategoryId });
  };

  const renderItem = ({ item }) => {
    if (item.empty) {
      return <View style={[styles.itemStyle, styles.itemInvisible]} />;
    }
    const handleQuickAdd = () => {
      // open quantity modal instead of immediate add
      setQuickProduct(item);
      setQuickQty(1);
      setQuickAddVisible(true);
    };

    return (
      <ProductsList
        item={item}
        onPress={() => navigation.navigate('ProductDetail', { detail: item, fromCustomerDetails, fromPOS: route?.params?.fromPOS })}
        showQuickAdd={!!route?.params?.fromPOS}
        onQuickAdd={handleQuickAdd}
      />
    );
  };

  const renderEmptyState = () => (
    <EmptyState imageSource={require('@assets/images/EmptyData/empty_data.png')} message={''} />
  );

  const renderContent = () => (
    <FlashList
      data={formatData(passedFilteredProducts ? filteredProducts : data, 3)}
      numColumns={3}
      renderItem={renderItem}
      keyExtractor={(item, index) => index.toString()}
      contentContainerStyle={{ padding: 10, paddingBottom: 50 }}
      onEndReached={handleLoadMore}
      showsVerticalScrollIndicator={false}
      onEndReachedThreshold={0.2}
      estimatedItemSize={100}
    />
  );

  const renderProducts = () => {
    const productsToShow = passedFilteredProducts ? filteredProducts : data;
    if (productsToShow.length === 0 && !loading) {
      return renderEmptyState();
    }
    return renderContent();
  };

  return (
    <SafeAreaView>
      <NavigationHeader title="Products" onBackPress={handleBack} />
      <SearchContainer
        placeholder="Search Products"
        onChangeText={handleSearchTextChange}
        value={searchText}
      />
      <RoundedContainer>
        {renderProducts()}
      </RoundedContainer>
      <OverlayLoader visible={loading || backLoading} />

      {/* Quick Add modal for ProductsScreen */}
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
                  // close qty modal and show confirmation popup
                  setQuickAddVisible(false);
                  setConfirmVisible(true);
                  setTimeout(() => {
                    setConfirmVisible(false);
                    setQuickProduct(null);
                    setQuickQty(1);
                  }, 900); // auto-dismiss after 900ms
                } catch (e) {
                  // quick add failed
                  setQuickAddVisible(false);
                }
              }} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#111827' }}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Add</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {/* Confirmation popup after add */}
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
