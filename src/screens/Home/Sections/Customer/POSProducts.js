import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ScrollView, Modal, Pressable, StyleSheet as RNStyleSheet, InteractionManager, Platform, Alert, ActivityIndicator } from 'react-native';
import { NavigationHeader } from '@components/Header';
import { ProductsList } from '@components/Product';
import { fetchPosPresets, addLineToOrderOdoo, updateOrderLineOdoo, removeOrderLineOdoo, fetchPosOrderById, fetchOrderLinesByIds, fetchPosCategoriesOdoo, fetchProductCategoriesOdoo, fetchCategoriesOdoo, preloadAllProducts, createDraftPosOrderOdoo, fetchPosPaymentMethodsOdoo, createPosOrderOdoo, createPosPaymentOdoo, fetchPOSSessions, fetchPricelistsOdoo, fetchPricelistItemsOdoo } from '@api/services/generalApi';
import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { formatData } from '@utils/formatters';
import { formatCurrency } from '@utils/formatters/currency';
import { OverlayLoader } from '@components/Loader';
import { SafeAreaView } from '@components/containers';
import { COLORS } from '@constants/theme';
import styles from './styles';
import { EmptyState } from '@components/common/empty';
import { useProductStore } from '@stores/product';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AntDesign } from '@expo/vector-icons';
import { Button } from '@components/common/Button';
import useKitchenTickets from '@stores/kitchen/ticketsStore';
import { useTranslation } from '@hooks';

// Helper: build Odoo headers from AsyncStorage (same as generalApi._buildOdooHeaders)
const _buildOdooHeadersLocal = async () => {
  const { DEFAULT_ODOO_DB, DEFAULT_ODOO_BASE_URL } = require('@api/config/odooConfig');
  const [deviceUrl, sessionId, deviceDb] = await Promise.all([
    AsyncStorage.getItem('device_server_url'),
    AsyncStorage.getItem('odoo_session_id'),
    AsyncStorage.getItem('device_db_name'),
  ]);
  const baseUrl = (deviceUrl || DEFAULT_ODOO_BASE_URL || '').replace(/\/+$/, '');
  const dbName = deviceDb || DEFAULT_ODOO_DB;
  const headers = { 'Content-Type': 'application/json', 'X-Odoo-Database': dbName };
  if (sessionId) {
    headers['Cookie'] = `session_id=${sessionId}`;
    headers['X-Openerp-Session-Id'] = sessionId;
  }
  return { baseUrl, dbName, headers };
};

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
  modalCard: { width: '88%', backgroundColor: '#fff', borderRadius: 16, padding: 20 },
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
  // Products modal header
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#2E294E',
  },
  productsBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productsHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
  },
  productsSearchWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#2E294E',
  },
  productsSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 2,
    minHeight: 46,
  },
  productsSearchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a2e',
    padding: 0,
    margin: 0,
  },
  catPill: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  catText: { fontWeight: '700', fontSize: 13 },
  catBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  catScroll: { paddingVertical: 6 },
  productsList: { padding: 10, paddingBottom: 80 },

  // Floating "Go to Register" button
  floatingRegisterBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E294E',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 28,
    ...Platform.select({
      ios: { shadowColor: '#2E294E', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 8 },
    }),
  },
  floatingRegisterText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  // Register panel — modern card
  registerPanel: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
    ...Platform.select({
      ios: { shadowColor: '#1a1a2e', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  registerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f8',
  },
  registerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: 0.3,
  },
  registerOrderName: {
    fontSize: 12,
    color: '#8896ab',
    fontWeight: '600',
    marginTop: 2,
  },
  registerUserBadge: {
    backgroundColor: '#f0f2f8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  registerUserText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7a90',
  },

  // Column header
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#f8f9fc',
    borderRadius: 10,
    marginBottom: 6,
  },
  colHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8896ab',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colDivider: {
    width: 1,
    backgroundColor: '#d0d5dd',
    alignSelf: 'stretch',
    marginHorizontal: 4,
  },
  rowDivider: {
    width: 1,
    backgroundColor: '#e0e3e8',
    alignSelf: 'stretch',
    marginHorizontal: 4,
  },

  // Order line
  orderLineRow: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderColor: '#f0f2f8',
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderLineSno: {
    fontWeight: '700',
    fontSize: 13,
    color: '#8896ab',
    width: 24,
    textAlign: 'center',
  },
  orderLineName: {
    fontWeight: '700',
    fontSize: 13,
    color: '#1a1a2e',
  },
  orderLinePrice: {
    color: '#8896ab',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  orderLineControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 130,
  },
  orderLineBtn: {
    backgroundColor: '#f0f2f8',
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderLineBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  orderLineQty: {
    minWidth: 30,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 14,
    color: '#1a1a2e',
    marginHorizontal: 2,
  },
  orderLineTotal: {
    fontWeight: '800',
    fontSize: 13,
    color: '#1a1a2e',
    width: 80,
    textAlign: 'right',
  },

  // Total section
  totalSection: {
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 2,
    borderTopColor: '#1a1a2e',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    color: '#8896ab',
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: 0.5,
  },

  // Bottom actions
  bottomActions: {
    marginTop: 14,
    gap: 10,
  },
  kitchenBillBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#7c3aed', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  kitchenBillBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },

  presetSheet: { backgroundColor: '#fff', padding: 12, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  presetTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  presetItem: { padding: 12, borderRadius: 8, marginBottom: 8 },
  presetText: { fontSize: 15, fontWeight: '700' },
  presetCancel: { padding: 12, marginTop: 6, borderRadius: 8, backgroundColor: '#f3f4f6' },
  presetCancelText: { textAlign: 'center', fontWeight: '700' },
  addProductsBtn: { paddingVertical: 8 },

  // Payment button on register panel
  payNowBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    ...Platform.select({
      ios: { shadowColor: '#16a34a', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  payNowBtnText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 },

  // Payment modal
  payModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  payModalCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, paddingBottom: 28, width: '100%', maxWidth: 500 },
  payModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  payModalTitle: { fontSize: 20, fontWeight: '900', color: '#1a1a2e' },
  payModalClose: { fontSize: 22, fontWeight: '700', color: '#8896ab', padding: 4 },
  payTotalBox: { backgroundColor: '#f8f9fc', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 20 },
  payTotalLabel: { fontSize: 13, fontWeight: '600', color: '#8896ab', marginBottom: 4 },
  payTotalValue: { fontSize: 32, fontWeight: '900', color: '#1a1a2e' },
  payMethodRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f6f8fa', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 8, borderWidth: 2, borderColor: '#eee' },
  payMethodRowActive: { backgroundColor: '#2E294E', borderColor: '#2E294E' },
  payModeIcon: { fontSize: 24, marginRight: 14 },
  payMethodName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  payMethodNameActive: { color: '#fff' },
  payMethodCheck: { fontSize: 18, fontWeight: '800', color: '#22c55e' },
  payAmountLabel: { fontSize: 14, fontWeight: '700', color: '#444', marginBottom: 8 },
  payAmountInput: { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, fontSize: 22, fontWeight: '700', color: '#1a1a2e', textAlign: 'center', backgroundColor: '#f8f9fc' },
  payChangeText: { color: '#16a34a', fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  payRemainingText: { color: '#dc2626', fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  payConfirmBtn: { backgroundColor: '#16a34a', paddingVertical: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: '#16a34a', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }, android: { elevation: 6 } }) },
  payConfirmText: { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 0.3 },

  // Discount info on order line
  discountInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  discountBadge: { backgroundColor: '#dc2626', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  discountBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  discountOrigPrice: { fontSize: 12, color: '#aaa', textDecorationLine: 'line-through', fontWeight: '500' },
  discountArrow: { fontSize: 12, color: '#aaa' },
  discountNewPrice: { fontSize: 13, color: '#16a34a', fontWeight: '800' },

  // Discount modal
  orderLineNote: { fontSize: 11, color: '#7c3aed', fontWeight: '600', marginTop: 3, fontStyle: 'italic' },

  // Note section in popup
  noteSection: { marginBottom: 16 },
  noteSectionTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  noteInput: { backgroundColor: '#f8f9fc', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, fontSize: 14, color: '#1a1a2e', minHeight: 70, fontWeight: '500' },
  discountSectionTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a2e', marginBottom: 10 },

  discountOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  discountCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  discountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  discountTitle: { fontSize: 20, fontWeight: '900', color: '#1a1a2e' },
  discountCloseBtn: { fontSize: 22, fontWeight: '700', color: '#8896ab', padding: 4 },
  discountProductName: { fontSize: 14, fontWeight: '600', color: '#6b7a90', marginBottom: 20, textAlign: 'center' },
  discountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 20 },
  discountOption: { width: '28%', backgroundColor: '#f6f8fa', borderRadius: 14, paddingVertical: 20, alignItems: 'center', borderWidth: 2, borderColor: '#eee' },
  discountOptionActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  discountOptionText: { fontSize: 22, fontWeight: '900', color: '#1a1a2e' },
  discountOptionTextActive: { color: '#fff' },
  discountRemoveBtn: { backgroundColor: '#fef2f2', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#fecaca' },
  discountRemoveBtnText: { color: '#dc2626', fontWeight: '800', fontSize: 15 },
  discountCancelBtn: { backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  discountCancelText: { fontWeight: '700', fontSize: 15, color: '#444' },

  // Pricelist toggle buttons
  pricelistRow: { flexDirection: 'row', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f2f8' },
  pricelistBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#f0f2f8', borderWidth: 1.5, borderColor: '#e0e3e8' },
  pricelistBtnNormal: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pricelistBtnTalabat: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  pricelistBtnText: { fontSize: 12, fontWeight: '800', color: '#6b7a90', letterSpacing: 0.5 },
  pricelistBtnTextActive: { color: '#fff' },
});

const POSProducts = ({ navigation, route }) => {
  const { t } = useTranslation();
  const {
    openingAmount, sessionId, registerId, registerName, userId, userName
  } = route?.params || {};

  // POS category state
  const [posCategories, setPosCategories] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [selectedPosCategoryId, setSelectedPosCategoryId] = useState(null);
  const [posFilteredProducts, setPosFilteredProducts] = useState(null);

  // Store
  const { addProduct, setCurrentCustomer, clearProducts, removeProduct, loadCustomerCart } = useProductStore();
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

  // Payment state
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedPayMethodId, setSelectedPayMethodId] = useState(null);
  const [payInputAmount, setPayInputAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [payMethods, setPayMethods] = useState([]);

  // Discount state
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [discountTargetItem, setDiscountTargetItem] = useState(null);
  const DISCOUNT_OPTIONS = [10, 20, 30, 40, 50];

  // Pricelist state
  const [pricelists, setPricelists] = useState([]);
  const [activePricelistId, setActivePricelistId] = useState(null);
  const activePricelistRef = useRef(null);
  const [pricelistItems, setPricelistItems] = useState({});
  const pricelistItemsRef = useRef({});
  const [noteText, setNoteText] = useState('');
  const pendingSyncs = useRef([]);  // Track pending addLine API calls
  const initialLoadDone = useRef(false);  // Track if initial server load is complete
  const orderIdRef = useRef(route?.params?.orderId || null);  // Mutable orderId — set lazily for takeaway

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

  // Load payment methods from Odoo (dynamic — fetches Cash, Talabat, Bank Transfer, Card, etc.)
  useEffect(() => {
    (async () => {
      try {
        const methods = await fetchPosPaymentMethodsOdoo();
        setPayMethods(methods);
        if (methods.length > 0) setSelectedPayMethodId(methods[0].id);
      } catch (_) {}
    })();
  }, []);

  // Load pricelists from Odoo
  useEffect(() => {
    (async () => {
      try {
        const lists = await fetchPricelistsOdoo();
        setPricelists(lists);

        // Check if order already has a pricelist set
        let orderPlId = null;
        const existingOrderId = orderIdRef.current;
        if (existingOrderId) {
          try {
            const orderResp = await fetchPosOrderById(existingOrderId);
            const plField = orderResp?.result?.pricelist_id;
            orderPlId = Array.isArray(plField) ? plField[0] : plField;
          } catch (_) {}
        }

        // Use order's pricelist if set, otherwise default to dine-in
        if (orderPlId && lists.some(p => p.id === orderPlId)) {
          setActivePricelistId(orderPlId);
          activePricelistRef.current = orderPlId;
        } else {
          const normal = lists.find(p => !p.name?.toLowerCase().includes('talabat') && !p.name?.toLowerCase().includes('application'));
          const defaultId = normal ? normal.id : (lists.length > 0 ? lists[0].id : null);
          if (defaultId) { setActivePricelistId(defaultId); activePricelistRef.current = defaultId; }
        }
        // Pre-fetch ALL pricelist items + ALL product template mappings for instant switching
        try {
          const { baseUrl, headers } = await _buildOdooHeadersLocal();
          // Fetch all pricelist items across all pricelists
          const allPlResp = await fetch(`${baseUrl}/web/dataset/call_kw`, {
            method: 'POST', headers,
            body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { model: 'product.pricelist.item', method: 'search_read', args: [[]], kwargs: { fields: ['pricelist_id', 'product_tmpl_id', 'product_id', 'fixed_price'], limit: 5000 } } }),
          });
          const allPlData = await allPlResp.json();
          const allItems = allPlData?.result || [];
          // Build cache: { plId: { tmplId: fixedPrice } }
          const cache = {};
          allItems.forEach(item => {
            const plId = Array.isArray(item.pricelist_id) ? item.pricelist_id[0] : item.pricelist_id;
            const tid = Array.isArray(item.product_tmpl_id) ? item.product_tmpl_id[0] : item.product_tmpl_id;
            const fp = item.fixed_price;
            if (plId && tid && fp !== false && fp !== null && fp !== undefined) {
              if (!cache[plId]) cache[plId] = {};
              cache[plId][tid] = Number(fp);
            }
          });

          // Fetch all products to map product_id → tmpl_id + lst_price
          const allProdResp = await fetch(`${baseUrl}/web/dataset/call_kw`, {
            method: 'POST', headers,
            body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { model: 'product.product', method: 'search_read', args: [[]], kwargs: { fields: ['id', 'product_tmpl_id', 'lst_price', 'list_price'], limit: 5000 } } }),
          });
          const allProdData = await allProdResp.json();
          const allProds = allProdData?.result || [];
          const prodMap = {};
          allProds.forEach(p => {
            prodMap[p.id] = {
              tmplId: Array.isArray(p.product_tmpl_id) ? p.product_tmpl_id[0] : p.product_tmpl_id,
              lstPrice: p.lst_price || p.list_price || 0,
            };
          });

          const plData2 = { _cache: cache, _prodMap: prodMap };
          setPricelistItems(plData2);
          pricelistItemsRef.current = plData2;
        } catch (_) {}
      } catch (_) {}
    })();
  }, []);

  // Switch pricelist — INSTANT using pre-cached data, then sync to Odoo in background
  const handleSwitchPricelist = useCallback((pricelistId) => {
    if (pricelistId === activePricelistRef.current) return;
    activePricelistRef.current = pricelistId;
    setActivePricelistId(pricelistId);

    const cartItems = useProductStore.getState().cartItems[useProductStore.getState().currentCustomerId] || [];
    if (cartItems.length === 0) return;

    const cache = pricelistItems?._cache || {};
    const prodMap = pricelistItems?._prodMap || {};
    const plCache = cache[pricelistId] || {};

    // INSTANT: Update all cart items from cache — no API calls
    for (const cartItem of cartItems) {
      const pid = cartItem.remoteId || (typeof cartItem.id === 'number' ? cartItem.id : null);
      if (!pid) continue;

      const info = prodMap[pid];
      const tmplId = info?.tmplId;

      // Priority: pricelist price → lst_price fallback
      let rawPrice = (tmplId && plCache[tmplId] !== undefined) ? plCache[tmplId] : (info?.lstPrice || cartItem.price_unit || cartItem.price || 0);

      // Round to 2 decimals (Odoo currency rounding) then 3 for display
      const exactPrice = Math.round(Math.round(Number(rawPrice) * 100) / 100 * 1000) / 1000;

      addProduct({ ...cartItem, price_unit: exactPrice, price: exactPrice, original_price_unit: undefined, discount_percent: 0 });
    }

    // BACKGROUND: Sync to Odoo (non-blocking)
    (async () => {
      try {
        const { baseUrl, headers } = await _buildOdooHeadersLocal();
        const orderId = orderIdRef.current;

        // Set pricelist on order
        if (orderId) {
          await fetch(`${baseUrl}/web/dataset/call_kw`, {
            method: 'POST', headers,
            body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { model: 'pos.order', method: 'write', args: [[orderId], { pricelist_id: pricelistId }], kwargs: {} } }),
          });

          // Update each order line price in Odoo
          for (const cartItem of cartItems) {
            const pid = cartItem.remoteId || (typeof cartItem.id === 'number' ? cartItem.id : null);
            if (!pid) continue;
            const info = prodMap[pid];
            const tmplId = info?.tmplId;
            let rawPrice = (tmplId && plCache[tmplId] !== undefined) ? plCache[tmplId] : (info?.lstPrice || 0);
            const exactPrice = Math.round(Math.round(Number(rawPrice) * 100) / 100 * 1000) / 1000;

            const lineId = await getOdooLineId(cartItem);
            if (lineId) {
              try { await updateOrderLineOdoo({ lineId, price_unit: exactPrice, qty: Number(cartItem.qty ?? cartItem.quantity ?? 1), orderId }); } catch (_) {}
            }
          }
        }
      } catch (_) {}
    })();

    Toast.show({ type: 'success', text1: 'Pricelist changed', text2: pricelists.find(p => p.id === pricelistId)?.name || '' });
  }, [pricelists, pricelistItems, addProduct, getOdooLineId]);

  // Payment handler — uses existing draft order, adds payment, validates to 'paid'
  const handlePayNow = useCallback(async (cartItems) => {
    if (!cartItems.length) return;
    if (!selectedPayMethodId) { Alert.alert(t.paymentFailed, t.selectPaymentMethod); return; }

    const existingOrderId = orderIdRef.current;
    if (!existingOrderId) { Alert.alert(t.paymentFailed, 'No order found. Please add items first.'); return; }

    setPaying(true);
    try {
      const { baseUrl, headers } = await _buildOdooHeadersLocal();

      const totalAmt = cartItems.reduce((s, it) => s + (Number(it.quantity ?? it.qty ?? 1) * Number(it.price_unit ?? it.price ?? 0)), 0);
      const selectedMethod = payMethods.find(m => m.id === selectedPayMethodId);
      const isCash = selectedMethod?.is_cash_count || String(selectedMethod?.name || '').toLowerCase().includes('cash');
      const paidAmt = isCash ? (parseFloat(payInputAmount) || totalAmt) : totalAmt;

      // Step 1: Add payment record to the existing order
      const paymentVals = {
        pos_order_id: existingOrderId,
        amount: paidAmt,
        payment_method_id: selectedPayMethodId,
        session_id: sessionId || false,
        company_id: 1,
      };

      const payResp = await fetch(`${baseUrl}/web/dataset/call_kw`, {
        method: 'POST', headers,
        body: JSON.stringify({
          jsonrpc: '2.0', method: 'call',
          params: { model: 'pos.payment', method: 'create', args: [paymentVals], kwargs: {} },
        }),
      });
      const payData = await payResp.json();
      if (payData?.error) {
        Alert.alert(t.paymentFailed, payData.error?.data?.message || payData.error?.message || 'Payment creation failed');
        return;
      }

      // Step 2: Update order amount_paid and state to 'paid'
      const updateResp = await fetch(`${baseUrl}/web/dataset/call_kw`, {
        method: 'POST', headers,
        body: JSON.stringify({
          jsonrpc: '2.0', method: 'call',
          params: {
            model: 'pos.order', method: 'write',
            args: [[existingOrderId], { amount_paid: paidAmt, amount_return: Math.max(0, paidAmt - totalAmt), state: 'paid' }],
            kwargs: {},
          },
        }),
      });
      const updateData = await updateResp.json();

      // Step 3: Try to validate/close the order via action_pos_order_paid
      try {
        await fetch(`${baseUrl}/web/dataset/call_kw`, {
          method: 'POST', headers,
          body: JSON.stringify({
            jsonrpc: '2.0', method: 'call',
            params: { model: 'pos.order', method: 'action_pos_order_paid', args: [[existingOrderId]], kwargs: {} },
          }),
        });
      } catch (_) {}

      // Step 4: Clear cart and navigate
      try { clearProducts(); } catch (_) {}
      const isTakeaway = String(route?.params?.order_type || '').toUpperCase() === 'TAKEAWAY';
      if (isTakeaway) { try { await AsyncStorage.removeItem('active_takeaway_order'); } catch (_) {} }

      setPayModalVisible(false);
      setPayInputAmount('');

      Alert.alert(t.paymentSuccessful, t.orderClosedSuccess, [{
        text: t.ok || 'OK',
        onPress: () => { isTakeaway ? navigation.navigate('Home') : navigation.navigate('TablesScreen'); },
      }]);
    } catch (e) {
      Alert.alert(t.paymentFailed, e?.message || 'Failed to process payment');
    } finally {
      setPaying(false);
    }
  }, [sessionId, selectedPayMethodId, payInputAmount, payMethods, route?.params?.order_type, navigation, t, clearProducts]);

  // Helper: get Odoo line ID from item (handles both odoo_line_ prefixed and raw IDs)
  const getOdooLineId = useCallback(async (item) => {
    if (String(item.id).startsWith('odoo_line_')) {
      return Number(String(item.id).replace('odoo_line_', ''));
    }
    // For items added from app — find the line in the server order
    const orderId = orderIdRef.current;
    if (!orderId) return null;
    try {
      const orderResp = await fetchPosOrderById(orderId);
      const lineIds = orderResp?.result?.lines ?? [];
      if (lineIds.length === 0) return null;
      const linesResp = await fetchOrderLinesByIds(lineIds);
      const lines = linesResp?.result ?? [];
      const productId = item.remoteId || item.id;
      const match = lines.find(l => {
        const pid = Array.isArray(l.product_id) ? l.product_id[0] : l.product_id;
        return pid === productId;
      });
      return match ? match.id : null;
    } catch (_) {
      return null;
    }
  }, []);

  // Discount handler — apply discount % to a single product
  const handleApplyDiscount = useCallback(async (percent) => {
    if (!discountTargetItem) return;
    const item = discountTargetItem;
    const originalPrice = Number(item.original_price_unit ?? item.price_unit ?? item.price ?? 0);
    const discountedPrice = Math.round((originalPrice * (1 - percent / 100)) * 1000) / 1000;

    // Update in local cart
    addProduct({
      ...item,
      price_unit: discountedPrice,
      price: discountedPrice,
      original_price_unit: originalPrice,
      discount_percent: percent,
    });

    // Sync with Odoo
    const orderId = orderIdRef.current;
    if (orderId) {
      const lineId = await getOdooLineId(item);
      if (lineId) {
        try {
          await updateOrderLineOdoo({ lineId, qty: Number(item.qty ?? item.quantity ?? 1), price_unit: originalPrice, discount: percent, note: item.note || undefined, orderId });
        } catch (e) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update discount in Odoo' });
        }
      }
    }

    setDiscountModalVisible(false);
    setDiscountTargetItem(null);
    Toast.show({ type: 'success', text1: `${percent}% discount applied`, text2: item.name });
  }, [discountTargetItem, addProduct, getOdooLineId]);

  // Remove discount from a product
  const handleRemoveDiscount = useCallback(async () => {
    if (!discountTargetItem) return;
    const item = discountTargetItem;
    const originalPrice = Number(item.original_price_unit ?? item.price_unit ?? item.price ?? 0);

    addProduct({
      ...item,
      price_unit: originalPrice,
      price: originalPrice,
      original_price_unit: undefined,
      discount_percent: 0,
    });

    const orderId = orderIdRef.current;
    if (orderId) {
      const lineId = await getOdooLineId(item);
      if (lineId) {
        try {
          await updateOrderLineOdoo({ lineId, qty: Number(item.qty ?? item.quantity ?? 1), price_unit: originalPrice, discount: 0, orderId });
        } catch (e) {}
      }
    }

    setDiscountModalVisible(false);
    setDiscountTargetItem(null);
    Toast.show({ type: 'info', text1: 'Discount removed', text2: item.name });
  }, [discountTargetItem, addProduct, getOdooLineId]);

  // Auto-save note to product (local + Odoo with debounce)
  const noteSyncTimer = useRef(null);
  const handleNoteChange = useCallback((text) => {
    setNoteText(text);
    if (!discountTargetItem) return;
    // Save locally immediately
    addProduct({ ...discountTargetItem, note: text });
    setDiscountTargetItem(prev => prev ? { ...prev, note: text } : null);

    // Debounce Odoo sync (800ms after last keystroke)
    if (noteSyncTimer.current) clearTimeout(noteSyncTimer.current);
    const itemRef = discountTargetItem;
    noteSyncTimer.current = setTimeout(async () => {
      const orderId = orderIdRef.current;
      if (orderId && itemRef) {
        const lineId = await getOdooLineId(itemRef);
        if (lineId) {
          try {
            await updateOrderLineOdoo({ lineId, note: text, orderId });
          } catch (_) {}
        }
      }
    }, 800);
  }, [discountTargetItem, addProduct, getOdooLineId]);

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
    setSearchText('');
    setDebouncedSearch('');
    setSelectedPosCategoryId(null);
  }, []);

  // --- Persistent product name cache (survives screen remounts) ---
  const saveProductNames = useCallback(async (orderId, nameMap) => {
    if (!orderId || !nameMap) return;
    try { await AsyncStorage.setItem(`order_names_${orderId}`, JSON.stringify(nameMap)); } catch (_) {}
  }, []);

  const loadProductNames = useCallback(async (orderId) => {
    if (!orderId) return {};
    try {
      const raw = await AsyncStorage.getItem(`order_names_${orderId}`);
      return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
  }, []);

  // Map pos.order.line -> product format
  const mapLineToProduct = useCallback((line) => {
    const productId = Array.isArray(line.product_id) ? line.product_id[0] : line.product_id;
    const nameFromProductId = Array.isArray(line.product_id) && line.product_id[1] ? String(line.product_id[1]) : '';
    const productName = line.full_product_name
      || (nameFromProductId || null)
      || (line.name && line.name !== '/' ? line.name : null)
      || line.display_name
      || line.product_name
      || 'Product';
    const qty = Number(line.qty || 1);
    const unitPrice = Number(line.price_unit || 0);
    const subtotalIncl = Number(line.price_subtotal_incl ?? line.price_subtotal ?? (qty * unitPrice));
    const discountPct = Number(line.discount || 0);
    const originalPrice = unitPrice;
    // Use Odoo's pre-calculated subtotal for exact price, avoid floating point errors
    const effectivePrice = discountPct > 0
      ? Math.round((originalPrice * (1 - discountPct / 100)) * 1000) / 1000
      : originalPrice;

    return {
      id: `odoo_line_${line.id}`,
      remoteId: productId,
      name: productName,
      price: effectivePrice,
      price_unit: effectivePrice,
      original_price_unit: discountPct > 0 ? originalPrice : undefined,
      discount_percent: discountPct,
      note: line.customer_note || '',
      quantity: qty,
      qty,
      price_subtotal: Number(line.price_subtotal ?? (qty * effectivePrice)),
      price_subtotal_incl: subtotalIncl,
    };
  }, []);

  // Load order from server — ONLY when local cart is empty (first open of this table)
  // Once items exist in local cart, NEVER overwrite them with server data
  const refreshServerOrder = useCallback(async (orderId) => {
    if (!orderId) return;
    const cartOwner = `order_${orderId}`;
    setCurrentCustomer(cartOwner);

    // If local cart already has items, sync notes/discounts from server
    const localCart = useProductStore.getState().cartItems[cartOwner] || [];
    if (localCart.length > 0) {
      try {
        const orderResp = await fetchPosOrderById(orderId);
        const orderResult = orderResp?.result ?? null;
        setOrderInfo(orderResult);
        // Sync pricelist button from order
        if (orderResult?.pricelist_id) {
          const plId = Array.isArray(orderResult.pricelist_id) ? orderResult.pricelist_id[0] : orderResult.pricelist_id;
          if (plId) { setActivePricelistId(plId); activePricelistRef.current = plId; }
        }
        // Sync notes and discounts from Odoo back to local cart
        const lineIds = orderResp?.result?.lines ?? [];
        if (lineIds.length > 0) {
          const linesResp = await fetchOrderLinesByIds(lineIds);
          const serverLines = linesResp?.result ?? [];
          const updatedCart = localCart.map(item => {
            const productId = item.remoteId || item.id;
            const lineId = String(item.id).startsWith('odoo_line_') ? Number(String(item.id).replace('odoo_line_', '')) : null;
            const serverLine = lineId
              ? serverLines.find(l => l.id === lineId)
              : serverLines.find(l => (Array.isArray(l.product_id) ? l.product_id[0] : l.product_id) === productId);
            if (serverLine) {
              const serverDiscount = Number(serverLine.discount || 0);
              const serverNote = serverLine.customer_note || '';
              const origPrice = Number(serverLine.price_unit || item.price_unit || item.price || 0);
              const effectivePrice = serverDiscount > 0
                ? Math.round((origPrice * (1 - serverDiscount / 100)) * 1000) / 1000
                : origPrice;
              return {
                ...item,
                note: serverNote,
                discount_percent: serverDiscount,
                price_unit: effectivePrice,
                price: effectivePrice,
                original_price_unit: serverDiscount > 0 ? origPrice : undefined,
              };
            }
            return item;
          });
          loadCustomerCart(cartOwner, updatedCart);
        }
      } catch (_) {}
      return;
    }

    // Local cart is empty — load from server (first time opening this table)
    try {
      const orderResp = await fetchPosOrderById(orderId);
      const orderResult = orderResp?.result ?? null;
      const CLOSED_STATES = ['done', 'receipt', 'paid', 'invoiced', 'posted', 'cancel'];
      if (orderResult && CLOSED_STATES.includes(String(orderResult.state))) {
        setLoadedOrderLines([]);
        setOrderInfo(orderResult);
        return;
      }
      const lineIds = orderResult?.lines ?? [];
      if (lineIds.length > 0) {
        const linesResp = await fetchOrderLinesByIds(lineIds);
        const lines = linesResp?.result ?? [];

        // Load saved product names from persistent storage
        const savedNames = await loadProductNames(orderId);

        // Merge server lines with the same product ID
        const mergedByProduct = {};
        const mergeOrder = [];
        lines.forEach(line => {
          const mapped = mapLineToProduct(line);
          const pid = mapped.remoteId;
          if (pid && mergedByProduct[pid]) {
            mergedByProduct[pid].quantity += mapped.quantity;
            mergedByProduct[pid].qty += mapped.qty;
            const q = mergedByProduct[pid].qty;
            const u = mergedByProduct[pid].price_unit;
            mergedByProduct[pid].price_subtotal = q * u;
            mergedByProduct[pid].price_subtotal_incl = q * u;
          } else {
            if (pid && savedNames[pid]) {
              mapped.name = savedNames[pid];
              mapped.product_name = savedNames[pid];
            }
            mergedByProduct[pid || mapped.id] = mapped;
            mergeOrder.push(pid || mapped.id);
          }
        });

        const mergedItems = mergeOrder.map(key => mergedByProduct[key]);
        clearProducts();
        mergedItems.forEach(item => addProduct(item));
        setLoadedOrderLines(lines);
      }
      setOrderInfo(orderResult);
    } catch (err) {}
  }, [clearProducts, setCurrentCustomer, addProduct, mapLineToProduct, loadProductNames]);

  // Keep orderIdRef in sync if navigation params update (e.g. after lazy creation)
  useEffect(() => {
    if (route?.params?.orderId) orderIdRef.current = route.params.orderId;
  }, [route?.params?.orderId]);

  // Set cart owner on every focus, load from server only when cart is empty
  useFocusEffect(
    useCallback(() => {
      const orderId = orderIdRef.current;
      if (orderId) {
        try { setCurrentCustomer(`order_${orderId}`); } catch (e) {}
        (async () => { try { await refreshServerOrder(orderId); } catch (e) {} })();
      } else {
        // No order yet (takeaway before first product) — use temporary cart owner
        const tempOwner = route?.params?.cartOwner || 'pos_guest';
        try { setCurrentCustomer(tempOwner); } catch (e) {}
      }
    }, [route?.params?.orderId, route?.params?.cartOwner, setCurrentCustomer, refreshServerOrder])
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
      // Only load from route params if local cart is empty
      const existingCart = useProductStore.getState().cartItems[cartOwner] || [];
      if (existingCart.length === 0) {
        // Build cart array synchronously from orderLines first
        const mappedItems = orderLines.map(line => mapLineToProduct(line));
        // Atomically set customer + cart in one store update
        loadCustomerCart(cartOwner, mappedItems);
        setLoadedOrderLines(orderLines);
        // Then apply saved names asynchronously (updates in-place)
        (async () => {
          const savedNames = await loadProductNames(orderId);
          if (Object.keys(savedNames).length > 0) {
            const currentCart = useProductStore.getState().cartItems[cartOwner] || [];
            const updatedCart = currentCart.map(item => {
              const pid = item.remoteId;
              if (pid && savedNames[pid]) {
                return { ...item, name: savedNames[pid], product_name: savedNames[pid] };
              }
              return item;
            });
            loadCustomerCart(cartOwner, updatedCart);
          }
        })();
      } else {
        setCurrentCustomer(cartOwner);
      }
    }
  }, []);

  // Load categories on mount — use same API as home screen "Our Specials"
  useEffect(() => {
    (async () => {
      try {
        const [homeCategories, prodResp] = await Promise.all([
          fetchCategoriesOdoo({ offset: 0, limit: 100 }),
          fetchProductCategoriesOdoo(),
        ]);
        const catList = Array.isArray(homeCategories) ? homeCategories : [];
        // Map home-screen format (_id, name) to pos format (id, name)
        const mapped = catList.map(c => ({ id: c._id || c.id, name: c.name || c.category_name || '' }));
        setPosCategories(mapped);
        setProductCategories(Array.isArray(prodResp) ? prodResp : (prodResp?.result ?? []));
      } catch (e) {
        // Fallback: try raw pos categories
        try {
          const posResp = await fetchPosCategoriesOdoo();
          const posListRaw = Array.isArray(posResp) ? posResp : (posResp?.result ?? []);
          setPosCategories(posListRaw);
        } catch (_) {}
      }
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

  // Helper: ensure an orderId exists — creates the draft order lazily for takeaway
  const ensureOrderId = useCallback(async () => {
    if (orderIdRef.current) return orderIdRef.current;
    // Create the draft order on the server now
    const created = await createDraftPosOrderOdoo({
      sessionId,
      userId,
      tableId: route?.params?.tableId || false,
      preset_id: route?.params?.preset_id || 10,
      order_type: route?.params?.order_type || 'TAKEAWAY',
    });
    if (created && created.result) {
      orderIdRef.current = created.result;
      const cartOwner = `order_${created.result}`;
      // Move current cart items to the new order's cart owner
      const currentCart = useProductStore.getState().cartItems[useProductStore.getState().currentCustomerId] || [];
      loadCustomerCart(cartOwner, currentCart);
      // Update navigation params so other screens can access the orderId
      navigation.setParams({ orderId: created.result, cartOwner });
      return created.result;
    }
    throw new Error('Failed to create order');
  }, [sessionId, userId, route?.params?.tableId, route?.params?.preset_id, route?.params?.order_type, loadCustomerCart, navigation]);

  const handleAdd = useCallback((p, qtyOverride = 1) => {
    const productName = p.product_name || p.name || p.display_name || p.full_product_name || `Product #${p.id}`;
    let productPrice = p.price || p.list_price || 0;

    // Use cached pricelist price for the active pricelist (instant, no API)
    const currentPlId = activePricelistRef.current;
    const plRef = pricelistItemsRef.current;
    if (currentPlId && plRef?._cache && plRef?._prodMap) {
      const plCache = plRef._cache[currentPlId];
      const prodInfo = plRef._prodMap[p.id];
      if (plCache && prodInfo?.tmplId && plCache[prodInfo.tmplId] !== undefined) {
        productPrice = Math.round(Math.round(Number(plCache[prodInfo.tmplId]) * 100) / 100 * 1000) / 1000;
      }
    }

    // Check if this product already exists in the cart (by remoteId / product ID)
    const localCart = useProductStore.getState().cartItems[useProductStore.getState().currentCustomerId] || [];
    const existing = localCart.find(item => {
      const itemProductId = item.remoteId || (typeof item.id === 'number' ? item.id : null);
      return itemProductId === p.id;
    });

    if (existing) {
      // Product already in cart — increment qty on the existing entry
      const newQty = Number(existing.quantity ?? existing.qty ?? 1) + qtyOverride;
      addProduct({ ...existing, quantity: newQty, qty: newQty });

      const orderId = orderIdRef.current;
      if (orderId && String(existing.id).startsWith('odoo_line_')) {
        const lineId = Number(String(existing.id).replace('odoo_line_', ''));
        const promise = updateOrderLineOdoo({ lineId, qty: newQty, price_unit: existing.price_unit ?? existing.price, orderId })
          .catch(() => Toast.show({ type: 'error', text1: 'Odoo Error', text2: 'Failed to update quantity' }))
          .finally(() => { pendingSyncs.current = pendingSyncs.current.filter(pr => pr !== promise); });
        pendingSyncs.current.push(promise);
      } else if (orderId) {
        const promise = addLineToOrderOdoo({ orderId, productId: p.id, qty: qtyOverride, price_unit: productPrice, name: productName })
          .catch(() => Toast.show({ type: 'error', text1: 'Odoo Error', text2: 'Failed to sync with server' }))
          .finally(() => { pendingSyncs.current = pendingSyncs.current.filter(pr => pr !== promise); });
        pendingSyncs.current.push(promise);
      }
    } else {
      // New product — add fresh entry
      const product = {
        id: p.id,
        remoteId: p.id,
        name: productName,
        product_name: productName,
        price: productPrice,
        price_unit: productPrice,
        quantity: qtyOverride,
        imageUrl: p.imageUrl || p.image_url || p.image || '',
      };
      addProduct(product);

      // Create the server order lazily (first product triggers it), then add line
      ensureOrderId().then(orderId => {
        const promise = addLineToOrderOdoo({ orderId, productId: p.id, qty: qtyOverride, price_unit: productPrice, name: productName })
          .catch(() => Toast.show({ type: 'error', text1: 'Odoo Error', text2: 'Failed to sync with server' }))
          .finally(() => { pendingSyncs.current = pendingSyncs.current.filter(pr => pr !== promise); });
        pendingSyncs.current.push(promise);
      }).catch(() => Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to create order' }));
    }

    // Persist the product name so it survives screen remounts
    const orderId = orderIdRef.current;
    if (orderId && p.id) {
      loadProductNames(orderId).then(nameMap => {
        nameMap[p.id] = productName;
        saveProductNames(orderId, nameMap);
      }).catch(() => {});
    }
  }, [addProduct, loadProductNames, saveProductNames, ensureOrderId]);

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
    const orderId = orderIdRef.current;
    if (orderId) {
      refreshServerOrder(orderId).catch(() => {});
    }
    navigation.navigate('POSCartSummary', { openingAmount, sessionId, registerId, registerName, userId, userName });
  }, [navigation, openingAmount, sessionId, registerId, registerName, userId, userName, refreshServerOrder]);

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

  const renderOrderLine = ({ item, index }) => {
    const qty = Number(item.qty ?? item.quantity ?? 1);
    const unit = Number(item.price_unit ?? item.price ?? 0);
    const subtotal = qty * unit;

    const handleIncrease = async () => {
      const newQty = qty + 1;
      const orderId = orderIdRef.current;
      addProduct({ ...item, quantity: newQty, qty: newQty });
      if (orderId) {
        const lineId = await getOdooLineId(item);
        if (lineId) {
          try {
            await updateOrderLineOdoo({ lineId, qty: newQty, price_unit: item.price_unit ?? item.price, orderId });
          } catch (e) {
            Toast.show({ type: 'error', text1: 'Odoo Error', text2: 'Failed to update quantity' });
            try { await refreshServerOrder(orderId); } catch (_) {}
          }
        } else if (item.remoteId) {
          try {
            await addLineToOrderOdoo({ orderId, productId: item.remoteId || item.id, qty: 1, price_unit: item.price_unit ?? item.price, name: item.name });
          } catch (e) {
            Toast.show({ type: 'error', text1: 'Odoo Error', text2: 'Failed to add product to order' });
            try { await refreshServerOrder(orderId); } catch (_) {}
          }
        }
      }
    };

    const handleDecrease = async () => {
      const orderId = orderIdRef.current;
      if (qty <= 1) {
        removeProduct(item.id);
        if (orderId) {
          const lineId = await getOdooLineId(item);
          if (lineId) {
            try { await removeOrderLineOdoo({ lineId, orderId }); } catch (_) {}
          }
          try { await refreshServerOrder(orderId); } catch (_) {}
        }
      } else {
        const newQty = qty - 1;
        addProduct({ ...item, quantity: newQty, qty: newQty });
        if (orderId) {
          const lineId = await getOdooLineId(item);
          if (lineId) {
            try {
              await updateOrderLineOdoo({ lineId, qty: newQty, price_unit: item.price_unit ?? item.price, orderId });
            } catch (e) {
              Toast.show({ type: 'error', text1: 'Odoo Error', text2: 'Failed to update quantity' });
              try { await refreshServerOrder(orderId); } catch (_) {}
            }
          }
        }
      }
    };

    const discountPct = Number(item.discount_percent || 0);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => { setDiscountTargetItem(item); setNoteText(item.note || ''); setDiscountModalVisible(true); }}
        style={localStyles.orderLineRow}
      >
        <Text style={[localStyles.orderLineSno, { textAlign: 'center' }]}>{index + 1}.</Text>
        <View style={localStyles.rowDivider} />
        <View style={{ flex: 1 }}>
          <Text style={localStyles.orderLineName}>{item.name || item.full_product_name || item.product_name || (Array.isArray(item.product_id) ? item.product_id[1] : null) || `Product #${item.remoteId || item.id}`}</Text>
          {discountPct > 0 ? (
            <>
              <View style={localStyles.discountInfoRow}>
                <View style={localStyles.discountBadge}>
                  <Text style={localStyles.discountBadgeText}>-{discountPct}%</Text>
                </View>
                <Text style={localStyles.discountOrigPrice}>{formatCurrency(Number(item.original_price_unit)).replace(/^\w+\s/, '')}</Text>
                <Text style={localStyles.discountArrow}>→</Text>
                <Text style={localStyles.discountNewPrice}>{formatCurrency(unit).replace(/^\w+\s/, '')} {t.each}</Text>
              </View>
            </>
          ) : (
            <Text style={localStyles.orderLinePrice}>{formatCurrency(unit).replace(/^\w+\s/, '')} {t.each}</Text>
          )}
          {item.note ? <Text style={localStyles.orderLineNote}>📝 {item.note}</Text> : null}
        </View>
        <View style={localStyles.rowDivider} />
        <View style={localStyles.orderLineControls}>
          <TouchableOpacity onPress={handleDecrease} style={localStyles.orderLineBtn}>
            <Text style={localStyles.orderLineBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={localStyles.orderLineQty}>{qty}</Text>
          <TouchableOpacity onPress={handleIncrease} style={localStyles.orderLineBtn}>
            <Text style={localStyles.orderLineBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={localStyles.rowDivider} />
        <Text style={localStyles.orderLineTotal}>{formatCurrency(subtotal)}</Text>
      </TouchableOpacity>
    );
  };

  const renderRegisterPanel = () => {
    const cartItems = useProductStore((s) => s.getCurrentCart()) || [];
    const total = cartItems.reduce((s, it) => {
      const itQty = Number(it.quantity ?? it.qty ?? 1);
      const itUnit = Number(it.price_unit ?? it.price ?? 0);
      const lineTotal = itQty * itUnit;
      return s + lineTotal;
    }, 0);

    return (
      <View style={localStyles.registerPanel}>
        {/* Header with order name and user badge */}
        <View style={localStyles.registerHeader}>
          <View style={{ flex: 1 }}>
            <Text style={localStyles.registerTitle}>{route?.params?.registerName || t.register}</Text>
            {orderInfo?.name && orderInfo.name !== '/' ? <Text style={localStyles.registerOrderName}>{orderInfo.name}</Text> : (orderInfo?.id ? <Text style={localStyles.registerOrderName}>{t.order} #{orderInfo.id}</Text> : null)}
          </View>
          <View style={localStyles.registerUserBadge}>
            <Text style={localStyles.registerUserText}>{route?.params?.userName || t.staff}</Text>
          </View>
        </View>

        {/* Pricelist Toggle — only Dine In and Application buttons */}
        {(() => {
          const talabatPl = pricelists.find(p => p.name?.toLowerCase().includes('talabat') || p.name?.toLowerCase().includes('application'));
          const normalPl = pricelists.find(p => p.id !== talabatPl?.id);
          if (!talabatPl || !normalPl) return null;
          return (
            <View style={localStyles.pricelistRow}>
              <TouchableOpacity
                style={[localStyles.pricelistBtn, activePricelistId === normalPl.id && localStyles.pricelistBtnNormal]}
                onPress={() => handleSwitchPricelist(normalPl.id)}
                activeOpacity={0.7}
              >
                <Text style={[localStyles.pricelistBtnText, activePricelistId === normalPl.id && localStyles.pricelistBtnTextActive]}>DINE IN PRICE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[localStyles.pricelistBtn, activePricelistId === talabatPl.id && localStyles.pricelistBtnTalabat]}
                onPress={() => handleSwitchPricelist(talabatPl.id)}
                activeOpacity={0.7}
              >
                <Text style={[localStyles.pricelistBtnText, activePricelistId === talabatPl.id && localStyles.pricelistBtnTextActive]}>APPLICATION PRICE</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Column header */}
        <View style={localStyles.columnHeader}>
          <Text style={[localStyles.colHeaderText, { width: 24, textAlign: 'center' }]}>#</Text>
          <View style={localStyles.colDivider} />
          <Text style={[localStyles.colHeaderText, { flex: 1 }]}>{t.items}</Text>
          <View style={localStyles.colDivider} />
          <Text style={[localStyles.colHeaderText, { width: 130, textAlign: 'center' }]}>{t.qty}</Text>
          <View style={localStyles.colDivider} />
          <Text style={[localStyles.colHeaderText, { width: 80, textAlign: 'right' }]}>{t.amount}</Text>
        </View>

        {/* Order lines */}
        <View style={{ flex: 1 }}>
          <FlatList
            data={cartItems}
            keyExtractor={item => String(item.id)}
            renderItem={renderOrderLine}
            ListEmptyComponent={
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>🛒</Text>
                <Text style={{ color: '#8896ab', fontWeight: '600', fontSize: 14 }}>{t.noItemsYet}</Text>
                <Text style={{ color: '#b0bec5', fontSize: 12, marginTop: 4 }}>{t.tapAddProducts}</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 6 }}
          />
        </View>

        {/* Total */}
        <View style={localStyles.totalSection}>
          <View style={localStyles.totalRow}>
            <Text style={localStyles.totalLabel}>{t.total}</Text>
            <Text style={localStyles.totalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Bottom action */}
        <View style={localStyles.bottomActions}>
          <TouchableOpacity disabled={cartItems.length === 0} onPress={async () => {
            // Wait for all pending add-line API calls to complete before navigating
            if (pendingSyncs.current.length > 0) {
              try { await Promise.all(pendingSyncs.current); } catch (_) {}
            }
            const orderId = orderIdRef.current || orderInfo?.id;
            navigation.navigate('KitchenBillPreview', {
              orderId, orderName: orderInfo?.name || '', tableName: orderInfo?.table_id?.[1] || '',
              serverName: route?.params?.userName || '', items: cartItems,
              cartOwner: route?.params?.cartOwner || (orderId ? `order_${orderId}` : 'pos_guest'),
              order_type: route?.params?.order_type,
              sessionId,
              userId,
            });
          }} style={[localStyles.kitchenBillBtn, cartItems.length === 0 && { opacity: 0.4 }]}>
            <Text style={localStyles.kitchenBillBtnText}>{t.kitchenBill}</Text>
          </TouchableOpacity>

          {/* Payment Button */}
          <TouchableOpacity
            disabled={cartItems.length === 0}
            onPress={() => {
              const totalAmt = cartItems.reduce((s, it) => s + (Number(it.quantity ?? it.qty ?? 1) * Number(it.price_unit ?? it.price ?? 0)), 0);
              setPayInputAmount(totalAmt.toFixed(3));
              setPayModalVisible(true);
            }}
            style={[localStyles.payNowBtn, cartItems.length === 0 && { opacity: 0.4 }]}
            activeOpacity={0.85}
          >
            <Text style={localStyles.payNowBtnText}>
              {t.payNow}  💰  {formatCurrency(cartItems.reduce((s, it) => s + (Number(it.quantity ?? it.qty ?? 1) * Number(it.price_unit ?? it.price ?? 0)), 0))}
            </Text>
          </TouchableOpacity>
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
      <NavigationHeader title={t.register} onBackPress={handleMainBack} logo={false} />
      <OverlayLoader visible={backLoading} />
      <View style={{ flex: 1, paddingHorizontal: 14, backgroundColor: '#f0f2f8' }}>
        {renderRegisterPanel()}

        <View style={localStyles.addProductsBtn}>
          <Button title={t.addProducts} onPress={() => setShowProducts(true)} />
        </View>

        <Modal visible={showProducts} animationType="slide" onRequestClose={handleCloseProducts}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f2f8' }}>
            {/* Modern header bar */}
            <View style={localStyles.productsHeader}>
              <TouchableOpacity onPress={handleCloseProducts} style={localStyles.productsBackBtn} activeOpacity={0.7}>
                <AntDesign name="left" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={localStyles.productsHeaderTitle}>{t.products}</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Search bar */}
            <View style={localStyles.productsSearchWrap}>
              <View style={localStyles.productsSearchBar}>
                <Text style={{ fontSize: 16, marginRight: 10 }}>🔍</Text>
                <TextInput
                  placeholder={t.searchProducts}
                  placeholderTextColor="#9ca3af"
                  onChangeText={handleSearchChange}
                  value={searchText}
                  style={localStyles.productsSearchInput}
                />
              </View>
            </View>

            {/* Category pills */}
            <View style={localStyles.catBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={localStyles.catScroll} keyboardShouldPersistTaps="handled">
                <TouchableOpacity onPress={() => setSelectedPosCategoryId(null)} style={{ marginRight: 8 }}>
                  <View style={[localStyles.catPill, selectedPosCategoryId === null ? { backgroundColor: '#2E294E', borderColor: '#2E294E' } : { backgroundColor: '#f3f4f6' }]}>
                    <Text style={[localStyles.catText, { color: selectedPosCategoryId === null ? '#fff' : '#374151' }]}>{t.showAll}</Text>
                  </View>
                </TouchableOpacity>
                {posCategories.length > 0 ? (
                  posCategories.map(cat => {
                    const id = cat.id || (Array.isArray(cat) ? cat[0] : null);
                    const name = cat.name || (Array.isArray(cat) ? cat[1] : '');
                    const selected = Number(id) === Number(selectedPosCategoryId);
                    return (
                      <TouchableOpacity key={String(id)} onPress={() => setSelectedPosCategoryId(id)} style={{ marginRight: 8 }}>
                        <View style={[localStyles.catPill, selected ? { backgroundColor: '#2E294E', borderColor: '#2E294E' } : { backgroundColor: '#f3f4f6' }]}>
                          <Text style={[localStyles.catText, { color: selected ? '#fff' : '#374151' }]}>{name}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={{ color: '#999', fontWeight: '600', fontSize: 13 }}>{t.loadingCategories}</Text>
                )}
              </ScrollView>
            </View>

            {/* Products grid */}
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
              {renderProducts()}
            </View>

            {/* Quick Add Modal */}
            <Modal visible={quickAddVisible} transparent animationType="none" onRequestClose={() => setQuickAddVisible(false)}>
              <Pressable style={localStyles.modalBackdrop} onPress={() => setQuickAddVisible(false)}>
                <Pressable style={localStyles.modalCard} onPress={(e) => e.stopPropagation()}>
                  <Text style={localStyles.modalTitle}>{t.addItem}</Text>
                  <Text style={localStyles.modalSubtitle}>{quickProduct?.product_name || quickProduct?.name || 'Product'}</Text>
                  <View style={localStyles.qtyRow}>
                    <Text style={localStyles.qtyLabel}>{t.quantity}</Text>
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
                      <Text style={localStyles.cancelText}>{t.cancel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={confirmQuickAdd} style={[localStyles.addBtn, { backgroundColor: COLORS.primary || '#111827' }]}>
                      <Text style={localStyles.addBtnText}>{t.addToCart}</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>

            {/* Confirmation chip — non-blocking */}
            {confirmVisible && (
              <View pointerEvents="none" style={localStyles.confirmOverlay}>
                <View style={localStyles.confirmChip}>
                  <Text style={localStyles.confirmTitle}>{t.addedToCart}</Text>
                  <Text style={localStyles.confirmSub}>{confirmName} × {confirmQty}</Text>
                </View>
              </View>
            )}

            {/* Floating "Go to Register" button */}
            <TouchableOpacity
              onPress={handleCloseProducts}
              style={localStyles.floatingRegisterBtn}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 16, marginRight: 8 }}>🛒</Text>
              <Text style={localStyles.floatingRegisterText}>{t.goToRegister}</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Modal>
      </View>

      {/* ── Payment Modal ─────────────────────────────────────── */}
      <Modal visible={payModalVisible} transparent animationType="slide" onRequestClose={() => setPayModalVisible(false)}>
        <View style={localStyles.payModalOverlay}>
          <View style={localStyles.payModalCard}>
            <View style={localStyles.payModalHeader}>
              <Text style={localStyles.payModalTitle}>{t.selectPaymentMethod}</Text>
              <TouchableOpacity onPress={() => setPayModalVisible(false)}>
                <Text style={localStyles.payModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {(() => {
              const cartItems = useProductStore.getState().cartItems[useProductStore.getState().currentCustomerId] || [];
              const totalAmt = cartItems.reduce((s, it) => s + (Number(it.quantity ?? it.qty ?? 1) * Number(it.price_unit ?? it.price ?? 0)), 0);
              const paidNum = parseFloat(payInputAmount) || 0;
              const changeAmt = paidNum - totalAmt;

              return (
                <>
                  <View style={localStyles.payTotalBox}>
                    <Text style={localStyles.payTotalLabel}>{t.orderTotal}</Text>
                    <Text style={localStyles.payTotalValue}>{formatCurrency(totalAmt)}</Text>
                  </View>

                  {/* Dynamic payment methods from Odoo */}
                  <ScrollView style={{ marginBottom: 16, maxHeight: payMethods.length > 6 ? 320 : undefined }} showsVerticalScrollIndicator={payMethods.length > 6}>
                    {payMethods.map(m => {
                      const isSelected = selectedPayMethodId === m.id;
                      const icon = m.is_cash_count || String(m.name).toLowerCase().includes('cash') ? '💵'
                        : String(m.name).toLowerCase().includes('card') ? '💳'
                        : String(m.name).toLowerCase().includes('bank') ? '🏦'
                        : '💳';
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={[localStyles.payMethodRow, isSelected && localStyles.payMethodRowActive]}
                          onPress={() => setSelectedPayMethodId(m.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={localStyles.payModeIcon}>{icon}</Text>
                          <Text style={[localStyles.payMethodName, isSelected && localStyles.payMethodNameActive]}>{m.name}</Text>
                          {isSelected && <Text style={localStyles.payMethodCheck}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Amount input for cash methods */}
                  {(() => {
                    const selMethod = payMethods.find(m => m.id === selectedPayMethodId);
                    const isCashMethod = selMethod?.is_cash_count || String(selMethod?.name || '').toLowerCase().includes('cash');
                    if (!isCashMethod) return null;
                    return (
                      <View style={{ marginBottom: 20 }}>
                        <Text style={localStyles.payAmountLabel}>{t.amountReceived}</Text>
                        <TextInput
                          style={localStyles.payAmountInput}
                          value={payInputAmount}
                          onChangeText={setPayInputAmount}
                          keyboardType="numeric"
                          placeholder="0.000"
                          placeholderTextColor="#bbb"
                        />
                        {changeAmt > 0 && <Text style={localStyles.payChangeText}>{t.change}: {changeAmt.toFixed(3)}</Text>}
                        {changeAmt < 0 && <Text style={localStyles.payRemainingText}>{t.remaining}: {Math.abs(changeAmt).toFixed(3)}</Text>}
                      </View>
                    );
                  })()}

                  <TouchableOpacity
                    style={[localStyles.payConfirmBtn, paying && { opacity: 0.7 }]}
                    onPress={() => handlePayNow(cartItems)}
                    disabled={paying || !selectedPayMethodId || (() => {
                      const selMethod = payMethods.find(m => m.id === selectedPayMethodId);
                      const isCashMethod = selMethod?.is_cash_count || String(selMethod?.name || '').toLowerCase().includes('cash');
                      return isCashMethod && paidNum < totalAmt;
                    })()}
                    activeOpacity={0.85}
                  >
                    {paying ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={localStyles.payConfirmText}>{t.pay} - {formatCurrency(totalAmt)}</Text>
                    )}
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Discount Modal ─────────────────────────────────────── */}
      <Modal visible={discountModalVisible} transparent animationType="fade" onRequestClose={() => setDiscountModalVisible(false)}>
        <Pressable style={localStyles.discountOverlay} onPress={() => setDiscountModalVisible(false)}>
          <Pressable style={localStyles.discountCard} onPress={(e) => e.stopPropagation()}>
            <View style={localStyles.discountHeader}>
              <Text style={localStyles.discountTitle}>Item Options</Text>
              <TouchableOpacity onPress={() => setDiscountModalVisible(false)}>
                <Text style={localStyles.discountCloseBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {discountTargetItem && (
              <Text style={localStyles.discountProductName}>
                {discountTargetItem.name || discountTargetItem.product_name || 'Product'}
              </Text>
            )}

            {/* Notes Section */}
            <View style={localStyles.noteSection}>
              <Text style={localStyles.noteSectionTitle}>Notes</Text>
              <TextInput
                style={localStyles.noteInput}
                value={noteText}
                onChangeText={handleNoteChange}
                placeholder="Add note for this item..."
                placeholderTextColor="#bbb"
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Discount Section */}
            <Text style={localStyles.discountSectionTitle}>Discount</Text>
            <View style={localStyles.discountGrid}>
              {DISCOUNT_OPTIONS.map(pct => (
                <TouchableOpacity
                  key={pct}
                  style={[localStyles.discountOption, discountTargetItem?.discount_percent === pct && localStyles.discountOptionActive]}
                  onPress={() => handleApplyDiscount(pct)}
                  activeOpacity={0.7}
                >
                  <Text style={[localStyles.discountOptionText, discountTargetItem?.discount_percent === pct && localStyles.discountOptionTextActive]}>{pct}%</Text>
                </TouchableOpacity>
              ))}
            </View>

            {discountTargetItem?.discount_percent > 0 && (
              <TouchableOpacity style={localStyles.discountRemoveBtn} onPress={handleRemoveDiscount} activeOpacity={0.7}>
                <Text style={localStyles.discountRemoveBtnText}>Remove Discount</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={localStyles.discountCancelBtn} onPress={() => setDiscountModalVisible(false)}>
              <Text style={localStyles.discountCancelText}>{t.cancel}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default POSProducts;
