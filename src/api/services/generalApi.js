// In-memory product cache: fetch all products once, filter instantly for each category
let _allProductsCache = null;
let _allProductsCacheTime = 0;
const PRODUCT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Preload all products into cache (call this early, e.g. on app start or table click)
export const preloadAllProducts = async () => {
  try {
    const response = await axios.post(
      `${ODOO_BASE_URL}/web/dataset/call_kw`,
      {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'product.template',
          method: 'search_read',
          args: [[]],
          kwargs: { fields: ['id', 'name', 'pos_categ_id', 'pos_categ_ids', 'list_price', 'default_code', 'image_128'] },
        },
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (response.data && response.data.error) {
      throw new Error(response.data.error.message || 'Odoo error');
    }
    const allProducts = response.data.result || [];
    const baseUrl = (ODOO_BASE_URL || '').replace(/\/$/, '');
    _allProductsCache = allProducts.map(p => {
      const hasBase64 = p.image_128 && typeof p.image_128 === 'string' && p.image_128.length > 0;
      const imageUrl = hasBase64
        ? `data:image/png;base64,${p.image_128}`
        : `${baseUrl}/web/image?model=product.template&id=${p.id}&field=image_128`;
      return { ...p, product_name: p.name || '', image_url: imageUrl };
    });
    _allProductsCacheTime = Date.now();
    return _allProductsCache;
  } catch (error) {
    throw error;
  }
};

// Clear product cache (call when products change in Odoo)
export const clearProductCache = () => {
  _allProductsCache = null;
  _allProductsCacheTime = 0;
};

// Fetch products from product.template where pos_categ_id/pos_categ_ids equals the given category id
export const fetchProductsByPosCategoryId = async (posCategoryId) => {
  try {
    if (!posCategoryId) throw new Error('posCategoryId is required');
    // Use cache if available and fresh, otherwise fetch and cache
    if (!_allProductsCache || (Date.now() - _allProductsCacheTime > PRODUCT_CACHE_TTL)) {
      await preloadAllProducts();
    }
    const catId = Number(posCategoryId);
    // Filter from cache — instant, no network call
    const filtered = _allProductsCache.filter(p => {
      // Check pos_categ_ids (Many2many - array of IDs) for Odoo 18/19
      if (Array.isArray(p.pos_categ_ids) && p.pos_categ_ids.length > 0) {
        return p.pos_categ_ids.includes(catId);
      }
      // Fallback: check pos_categ_id (Many2one) for older Odoo
      if (Array.isArray(p.pos_categ_id)) {
        return p.pos_categ_id[0] === catId;
      }
      return p.pos_categ_id === catId;
    });
    return filtered;
  } catch (error) {
    throw error;
  }
};
// Fetch all product categories from Odoo (product.category)
export const fetchProductCategoriesOdoo = async () => {
  try {
    const { DEFAULT_ODOO_DB, DEFAULT_ODOO_BASE_URL } = require('../config/odooConfig');
    const url = (DEFAULT_ODOO_BASE_URL || ODOO_BASE_URL || '').replace(/\/$/, '') + '/web/dataset/call_kw';
    const response = await axios.post(
      url,
      {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'product.category',
          method: 'search_read',
          args: [[]],
          kwargs: {
            fields: ['id', 'name', 'parent_id', 'complete_name'],
            order: 'complete_name',
          },
        },
      },
      { headers: { 'Content-Type': 'application/json', 'X-Odoo-Database': DEFAULT_ODOO_DB } }
    );
    if (response.data && response.data.error) {
      throw new Error(response.data.error.message || JSON.stringify(response.data.error) || 'Odoo error');
    }
    return response.data.result || [];
  } catch (error) {
    throw error;
  }
};
// Fetch POS categories from Odoo (pos.category)
export const fetchPosCategoriesOdoo = async () => {
  try {
    const { DEFAULT_ODOO_DB, DEFAULT_ODOO_BASE_URL } = require('../config/odooConfig');
    const url = (DEFAULT_ODOO_BASE_URL || ODOO_BASE_URL || '').replace(/\/$/, '') + '/web/dataset/call_kw';
    const response = await axios.post(
      url,
      {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'pos.category',
          method: 'search_read',
          args: [[]],
          kwargs: {
            // Request image fields so we can return inline/base64 images when available
            fields: ['id', 'name', 'parent_id', 'sequence', 'pos_config_ids', 'has_image', 'image_128', 'image_512'],
            order: 'sequence, name',
          },
        },
      },
      { headers: { 'Content-Type': 'application/json', 'X-Odoo-Database': DEFAULT_ODOO_DB } }
    );
    if (response.data && response.data.error) {
      throw new Error(response.data.error.message || JSON.stringify(response.data.error) || 'Odoo error');
    }
    return response.data.result || [];
  } catch (error) {
    throw error;
  }
};
// Full workflow: create invoice, post, pay, and log status
export const processInvoiceWithPaymentOdoo = async ({ partnerId, products = [], journalId, invoiceDate = null, reference = '', paymentAmount = null } = {}) => {
  try {
    // Step 0: If journalId is not provided, fetch and select sales journal
    let finalJournalId = journalId;
    if (!finalJournalId) {
      const journals = await fetchPaymentJournalsOdoo();
      const salesJournal = journals.find(j => j.type === 'sale');
      if (!salesJournal) throw new Error('No sales journal found in Odoo.');
      finalJournalId = salesJournal.id;
    }

    // Step 1: Create and post invoice
    const invoiceResult = await createInvoiceOdoo({ partnerId, products, journalId: finalJournalId, invoiceDate, reference });
    if (!invoiceResult.id) {
      throw new Error('Invoice creation failed');
    }
    if (invoiceResult.posted) {
    } else {
      throw new Error('Invoice was created but not posted. Cannot proceed with payment.');
    }

    // Step 2: Register payment for invoice
    let amount = paymentAmount;
    if (amount === null) {
      amount = products.reduce((sum, p) => sum + (p.price || p.price_unit || p.list_price || 0) * (p.quantity || p.qty || 1), 0);
    }

    const paymentResult = await createAccountPaymentOdoo({ partnerId, journalId: finalJournalId, amount, invoiceId: invoiceResult.id });
    if (!paymentResult.result) {
      throw new Error('Payment creation failed');
    }

    // Step 3: Post the payment
    const paymentId = paymentResult.result;
    const postPaymentResponse = await fetch(`${ODOO_BASE_URL}web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'account.payment',
          method: 'action_post',
          args: [[paymentId]],
          kwargs: {},
        },
        id: new Date().getTime(),
      }),
    });
    const postPaymentResult = await postPaymentResponse.json();
    // Step 4: Verify payment reconciliation
    const paymentStatusResponse = await fetch(`${ODOO_BASE_URL}web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'account.payment',
          method: 'search_read',
          args: [[['id', '=', paymentId]]],
          kwargs: { fields: ['id', 'reconciled', 'state', 'invoice_ids'] },
        },
        id: new Date().getTime(),
      }),
    });
    const paymentStatus = await paymentStatusResponse.json();
    const paymentDetails = paymentStatus.result?.[0];
    if (!paymentDetails.reconciled) {
      const reconcileResponse = await fetch(`${ODOO_BASE_URL}web/dataset/call_kw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'account.payment',
            method: 'reconcile',
            args: [[paymentId]],
            kwargs: {},
          },
          id: new Date().getTime(),
        }),
      });
      const reconcileResult = await reconcileResponse.json();
    }

    // Step 5: Verify invoice status
    const invoiceStatusResponse = await fetch(`${ODOO_BASE_URL}web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'account.move',
          method: 'search_read',
          args: [[['id', '=', invoiceResult.id]]],
          kwargs: { fields: ['id', 'payment_state', 'amount_residual'] },
        },
        id: new Date().getTime(),
      }),
    });
    const invoiceStatus = await invoiceStatusResponse.json();
    const updatedInvoice = invoiceStatus.result?.[0];

    if (updatedInvoice.payment_state === 'paid' && updatedInvoice.amount_residual === 0) {
    } else {
      throw new Error('[PROCESS] Invoice payment not fully processed. Check payment state or residual amount.');
    }

    return { invoiceResult, paymentResult, invoiceStatus: updatedInvoice };
  } catch (error) {
    return { error };
  }
};
// Validate POS order in Odoo to trigger name generation
export const validatePosOrderOdoo = async (orderId) => {
  try {
    const response = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.order',
        method: 'action_pos_order_paid',
        args: [[orderId]],
        kwargs: {},
      },
    }, { headers: { 'Content-Type': 'application/json' } });
    if (response.data && response.data.error) {
      return { error: response.data.error };
    }
    return { result: response.data.result };
  } catch (error) {
    return { error };
  }
};
// Fetch POS registers (configurations) from Odoo
export const fetchPOSRegisters = async ({ limit = 20, offset = 0 } = {}) => {
  try {
    const response = await axios.post(
      `${ODOO_BASE_URL}/web/dataset/call_kw`,
      {
        jsonrpc: "2.0",
        method: "call",
        params: {
          model: "pos.config",
          method: "search_read",
          args: [[]],
          kwargs: {
            fields: ["id", "name"],
            limit,
            offset,
            order: "id desc",
          },
        },
      },
      { headers: { "Content-Type": "application/json" } }
    );
    if (response.data.error) {
      throw new Error("Odoo JSON-RPC error");
    }
    return response.data.result || [];
  } catch (error) {
    throw error;
  }
};
// Fetch POS sessions (registers) from Odoo
export const fetchPOSSessions = async ({ limit = 20, offset = 0, state = '' } = {}) => {
  try {
    let domain = [];
    if (state) {
      domain = [["state", "=", state]];
    }
    const response = await axios.post(
      `${ODOO_BASE_URL}/web/dataset/call_kw`,
      {
        jsonrpc: "2.0",
        method: "call",
        params: {
          model: "pos.session",
          method: "search_read",
          args: [domain],
          kwargs: {
            fields: [
              "id",
              "name",
              "state",
              "user_id",
              "start_at",
              "stop_at",
              "cash_register_balance_end",
              "cash_register_balance_start",
              "config_id", // Added to allow frontend to extract posConfigId
            ],
            limit,
            offset,
            order: "id desc",
          },
        },
      },
      { headers: { "Content-Type": "application/json" } }
    );
    if (response.data.error) {
      throw new Error("Odoo JSON-RPC error");
    }
    return response.data.result || [];
  } catch (error) {
    throw error;
  }
};
// api/services/generalApi.js
import axios from "axios";
import ODOO_BASE_URL from '@api/config/odooConfig';
import { odooLogin } from './odooAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';


import { get } from "./utils";
import { API_ENDPOINTS } from "@api/endpoints";
import { useAuthStore } from '@stores/auth';
import handleApiError from "../utils/handleApiError";

// Debugging output for useAuthStore
export const fetchProducts = async ({ offset, limit, categoryId, searchText }) => {
  try {
    const queryParams = {
      ...(searchText !== undefined && { product_name: searchText }),
      offset,
      limit,
      ...(categoryId !== undefined && { category_id: categoryId }),
    };
    // Debugging output for queryParams
    const response = await get(API_ENDPOINTS.VIEW_PRODUCTS, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};



// 🔹 NEW: Fetch products directly from Odoo 19 via JSON-RPC
export const fetchProductsOdoo = async ({ offset, limit, searchText, categoryId } = {}) => {
  // Helper to actually fetch products
  const doFetch = async () => {
    // Short-circuit: categoryId === -1 means "no products"
    if (Number(categoryId) === -1) return [];
    // Base domain: active salable products
    let domain = [["sale_ok", "=", true]];
    if (categoryId) {
      // Filter by `categ_id` on product.template
      domain = ["&", ["sale_ok", "=", true], ["categ_id", "=", Number(categoryId)]];
      if (searchText && searchText.trim() !== "") {
        const term = searchText.trim();
        domain = [
          "&",
          ["sale_ok", "=", true],
          ["categ_id", "=", Number(categoryId)],
          ["name", "ilike", term],
        ];
      }
    } else if (searchText && searchText.trim() !== "") {
      const term = searchText.trim();
      domain = [
        "&",
        ["sale_ok", "=", true],
        ["name", "ilike", term],
      ];
    }
    const odooLimit = limit || 50;
    const response = await axios.post(
      `${ODOO_BASE_URL}/web/dataset/call_kw`,
      {
        jsonrpc: "2.0",
        method: "call",
        params: {
          model: "product.template",
          method: "search_read",
          args: [],
          kwargs: {
            domain,
            fields: [
              "id",
              "name",
              "list_price",
              "default_code",
              "uom_id",
              "image_128",
            ],
            limit: odooLimit,
            order: "name asc",
          },
        },
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    if (response.data.error) {
      // If session expired, propagate error for retry logic
      throw response.data.error;
    }
    const products = response.data.result || [];
    return products.map((p) => {
      const hasBase64 = p.image_128 && typeof p.image_128 === 'string' && p.image_128.length > 0;
      const baseUrl = (ODOO_BASE_URL || '').replace(/\/$/, '');
      const imageUrl = hasBase64
        ? `data:image/png;base64,${p.image_128}`
        : `${baseUrl}/web/image?model=product.template&id=${p.id}&field=image_128`;
      return {
        id: p.id,
        product_name: p.name || "",
        image_url: imageUrl,
        price: p.list_price || 0,
        code: p.default_code || "",
        uom: p.uom_id
          ? { uom_id: p.uom_id[0], uom_name: p.uom_id[1] }
          : null,
      };
    });
  };

  let retried = false;
  while (true) {
    try {
      return await doFetch();
    } catch (error) {
      // Detect Odoo session expired error
      const isSessionExpired = error && (error.message === 'Session expired' || error.name === 'odoo.http.SessionExpiredException');
      if (isSessionExpired && !retried) {
        retried = true;
        // Try to re-login using stored credentials
        try {
          const username = await AsyncStorage.getItem('odoo_username');
          const password = await AsyncStorage.getItem('odoo_password');
          if (username && password) {
            const loginResult = await odooLogin(username, password);
            if (loginResult.success) {
              continue; // Retry original request
            } else {
              throw new Error('Odoo re-login failed: ' + (loginResult.error?.message || loginResult.error));
            }
          } else {
            throw new Error('No Odoo credentials stored for auto-login.');
          }
        } catch (loginErr) {
          throw loginErr;
        }
      } else {
        // Not a session error or already retried
        throw error;
      }
    }
  }
};
// Ensure this points to your Odoo URL

// Fetch categories directly from Odoo using JSON-RPC
// NOTE: older code filtered by a non-existent `is_category` field which caused Odoo to raise
// "Invalid field product.category.is_category". Use a safe domain (empty) and apply
// `name ilike` only when a searchText is provided.
export const fetchCategoriesOdoo = async ({ offset = 0, limit = 50, searchText = "" } = {}) => {
  try {
    // Fetch POS-specific categories only (pos.category)
    const posCats = await fetchPosCategoriesOdoo();
    if (!Array.isArray(posCats) || posCats.length === 0) return [];

    const term = searchText && searchText.trim() ? searchText.trim().toLowerCase() : null;
    let filtered = term ? posCats.filter(c => (c.name || '').toLowerCase().includes(term)) : posCats;

    // Apply offset & limit
    const sliced = filtered.slice(offset, offset + limit);
    const baseUrl = (ODOO_BASE_URL || '').replace(/\/$/, '');

    return sliced.map(category => ({
      _id: category.id,
      name: category.name || '',
      complete_name: category.complete_name || category.name || '',
      parent: Array.isArray(category.parent_id) ? { id: category.parent_id[0], name: category.parent_id[1] } : null,
      children: Array.isArray(category.child_ids) ? category.child_ids : (Array.isArray(category.child_id) ? category.child_id : []),
      product_count: Number(category.product_count || 0),
      has_image: !!category.has_image || !!category.image_128 || !!category.image_512,
      // Prefer inline base64 images when present; otherwise provide a stable web/image URL fallback
      image: (category.image_128 && typeof category.image_128 === 'string' && category.image_128.length > 0)
        ? `data:image/png;base64,${category.image_128}`
        : ((category.image_512 && typeof category.image_512 === 'string' && category.image_512.length > 0)
            ? `data:image/png;base64,${category.image_512}`
            : `${baseUrl}/web/image?model=pos.category&id=${category.id}&field=image_128`),
      pos_config_ids: Array.isArray(category.pos_config_ids) ? category.pos_config_ids : [],
      sequence: category.sequence || 0,
      hour_after: category.hour_after ?? null,
      hour_until: category.hour_until ?? null,
      color: category.color ?? null,
      category_name: category.name || '',
    }));
  } catch (error) {
    throw error;
  }
};

// Fetch detailed product information for a single Odoo product id
export const fetchProductDetailsOdoo = async (productId) => {
  try {
    if (!productId) return null;

    // 1. Fetch product details
    const productResponse = await axios.post(
      `${ODOO_BASE_URL}/web/dataset/call_kw`,
      {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'product.template',
          method: 'search_read',
          args: [[['id', '=', productId]]],
          kwargs: {
            fields: [
              'id', 'name', 'list_price', 'default_code', 'uom_id', 'image_128',
              'description_sale', 'categ_id', 'qty_available', 'virtual_available'
            ],
            limit: 1,
          },
        },
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (productResponse.data.error) throw new Error('Odoo JSON-RPC error');
    const results = productResponse.data.result || [];
    const p = results[0];
    if (!p) return null;

    // 2. Fetch warehouse/stock info
    const quantResponse = await axios.post(
      `${ODOO_BASE_URL}/web/dataset/call_kw`,
      {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'stock.quant',
          method: 'search_read',
          args: [[['product_id', '=', productId]]],
          kwargs: {
            fields: ['location_id', 'quantity'],
          },
        },
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    let inventory_ledgers = [];
    if (quantResponse.data && quantResponse.data.result) {
      inventory_ledgers = quantResponse.data.result.map(q => ({
        warehouse_id: Array.isArray(q.location_id) ? q.location_id[0] : null,
        warehouse_name: Array.isArray(q.location_id) ? q.location_id[1] : '',
        total_warehouse_quantity: q.quantity,
      }));
    }

    // 3. Shape and return
    const hasBase64 = p.image_128 && typeof p.image_128 === 'string' && p.image_128.length > 0;
    const baseUrl = (ODOO_BASE_URL || '').replace(/\/$/, '');
    const imageUrl = hasBase64
      ? `data:image/png;base64,${p.image_128}`
      : `${baseUrl}/web/image?model=product.template&id=${p.id}&field=image_128`;

    return {
      id: p.id,
      product_name: p.name || '',
      image_url: imageUrl,
      price: p.list_price || 0,
      minimal_sales_price: p.list_price || null,
      inventory_ledgers,
      total_product_quantity: p.qty_available ?? p.virtual_available ?? 0,
      inventory_box_products_details: [],
      product_code: p.default_code || null,
      uom: p.uom_id ? { uom_id: p.uom_id[0], uom_name: p.uom_id[1] } : null,
      categ_id: p.categ_id || null,
      product_description: p.description_sale || null,
    };
  } catch (error) {
    throw error;
  }
};


export const fetchInventoryBoxRequest = async ({ offset, limit, searchText }) => {
  const currentUser = useAuthStore.getState().user; // Correct usage of useAuthStore
  const salesPersonId = currentUser.related_profile._id;

  // Debugging output for salesPersonId
  try {
    const queryParams = {
      offset,
      limit,
      ...(searchText !== undefined && { name: searchText }),
      ...(salesPersonId !== undefined && { sales_person_id: salesPersonId })
    };
    const response = await get(API_ENDPOINTS.VIEW_INVENTORY_BOX_REQUEST, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const fetchAuditing = async ({ offset, limit }) => {
  try {
    const queryParams = {
      offset,
      limit,
    };
    const response = await get(API_ENDPOINTS.VIEW_AUDITING, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const fetchCustomers = async ({ offset, limit, searchText }) => {
  try {
    const queryParams = {
      offset,
      limit,
      ...(searchText !== undefined && { name: searchText }),
    };
    const response = await get(API_ENDPOINTS.VIEW_CUSTOMERS, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};// 🔹 Fetch customers directly from Odoo 19 via JSON-RPC (no mobile field)
export const fetchCustomersOdoo = async ({ offset = 0, limit = 50, searchText } = {}) => {
  try {
    // 🔍 Domain for search (optional)
    let domain = [];

    if (searchText && searchText.trim() !== "") {
      const term = searchText.trim();
      domain = [
        "|",
        ["name", "ilike", term],
        ["phone", "ilike", term],
      ];
    }
const response = await axios.post(
  `${ODOO_BASE_URL}/web/dataset/call_kw`,
      {
        jsonrpc: "2.0",
        method: "call",
        params: {
          model: "res.partner",
          method: "search_read",
          args: [domain],
          kwargs: {
            fields: [
              "id", "name", "email", "phone",
              "street", "street2", "city", "zip", "country_id"
            ],
            offset,
            limit,
            order: "name asc",
          },
        },
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (response.data.error) {
      throw new Error("Odoo JSON-RPC error");
    }

    const partners = response.data.result || [];

    // 🔙 Shape result for your CustomerScreen
    return partners.map((p) => ({
      id: p.id,
      name: p.name || "",
      email: p.email || "",
      phone: p.phone || "",
      address: [
        p.street,
        p.street2,
        p.city,
        p.zip,
        p.country_id && Array.isArray(p.country_id) ? p.country_id[1] : ""
      ].filter(Boolean).join(", "),
    }));
  } catch (error) {
    throw error;
  }
};


export const fetchPickup = async ({ offset, limit, loginEmployeeId }) => {
  try {
    const queryParams = {
      offset,
      limit,
      ...(loginEmployeeId !== undefined && { login_employee_id: loginEmployeeId }),
    };
    const response = await get(API_ENDPOINTS.VIEW_PICKUP, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const fetchService = async ({ offset, limit, loginEmployeeId }) => {
  try {
    const queryParams = {
      offset,
      limit,
      ...(loginEmployeeId !== undefined && { login_employee_id: loginEmployeeId }),
    };
    const response = await get(API_ENDPOINTS.VIEW_SERVICE, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const fetchSpareParts = async ({ offset, limit, loginEmployeeId }) => {
  try {
    const queryParams = {
      offset,
      limit,
      ...(loginEmployeeId !== undefined && { login_employee_id: loginEmployeeId }),
    };
    const response = await get(API_ENDPOINTS.VIEW_SPARE_PARTS, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const fetchMarketStudy = async ({ offset, limit }) => {
  try {
    const queryParams = {
      offset,
      limit,
    };
    const response = await get(API_ENDPOINTS.VIEW_MARKET_STUDY, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const fetchCustomerVisitList = async ({ offset, limit, fromDate, toDate, customerId, customerName, employeeName, loginEmployeeId }) => {
  try {
    const queryParams = {
      offset,
      limit,
      ...(loginEmployeeId !== undefined && { login_employee_id: loginEmployeeId }),
      ...(customerName !== undefined && { customer_name: customerName }),
      ...(customerId !== undefined && { customer_id: customerId }),
      ...(employeeName !== undefined && { employee_name: employeeName }),
      ...(fromDate !== undefined && { from_date: fromDate }),
      ...(toDate !== undefined && { to_date: toDate }),
    };
    const response = await get(API_ENDPOINTS.VIEW_CUSTOMER_VISIT_LIST, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const fetchEnquiryRegister = async ({ offset, limit, loginEmployeeId }) => {
  try {
    const queryParams = {
      offset,
      limit,
      ...(loginEmployeeId !== undefined && { login_employee_id: loginEmployeeId }),
    };
    const response = await get(API_ENDPOINTS.VIEW_ENQUIRY_REGISTER, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const fetchPurchaseRequisition = async ({ offset, limit,searchText}) => {
  try {
    const queryParams = {
      offset,
      limit,
      ...(searchText !== undefined && { sequence_no: searchText }),
    };
    const response = await get(API_ENDPOINTS.VIEW_PURCHASE_REQUISITION,queryParams);
    return response.data;

  } catch(error){
    handleApiError(error);
    throw error;
  }
}

export const fetchPriceEnquiry = async ({ offset, limit,searchText}) => {
  try {
    const queryParams = {
      offset,
      limit,
      ...(searchText !== undefined && { sequence_no: searchText }),
    };
    const response = await get(API_ENDPOINTS.VIEW_PRICE,queryParams);
    return response.data;

  } catch(error){
    handleApiError(error);
    throw error;
  }
}

export const fetchPurchaseOrder = async ({ offset, limit,searchText}) => {
  try {
    const queryParams = {
      offset,
      limit,
      ...(searchText !== undefined && { sequence_no: searchText }),
    };
    const response = await get(API_ENDPOINTS.VIEW_PURCHASE_ORDER,queryParams);
    return response.data;

  } catch(error){
    handleApiError(error);
    throw error;
  }
}

export const fetchDeliveryNote = async ({ offset, limit,searchText}) => {
  try {
    const queryParams = {
      offset,
      limit,
      ...(searchText !== undefined && { sequence_no: searchText }),
    };
    const response = await get(API_ENDPOINTS.VIEW_DELIVERY_NOTE,queryParams);
    return response.data;

  } catch(error){
    handleApiError(error);
    throw error;
  }
}

export const fetchVendorBill = async ({ offset, limit,searchText}) => {
  try {
    const queryParams = {
      offset,
      limit,
      ...(searchText !== undefined && { sequence_no: searchText }),
    };
    const response = await get(API_ENDPOINTS.VIEW_VENDOR_BILL,queryParams);
    return response.data;

  } catch(error){
    handleApiError(error);
    throw error;
  }
}

export const fetchPaymentMade = async ({ offset, limit,searchText}) => {
  try {
    const queryParams = {
      offset,
      limit,
      ...(searchText !== undefined && { sequence_no: searchText }),
    };
    const response = await get(API_ENDPOINTS.VIEW_PAYMENT_MADE,queryParams);
    return response.data;

  } catch(error){
    handleApiError(error);
    throw error;
  }
}

// viewPaymentMade

export const fetchLead = async ({ offset, limit, loginEmployeeId }) => {
  try {
    const queryParams = {
      offset,
      limit,
      ...(loginEmployeeId !== undefined && { login_employee_id: loginEmployeeId }),
      // ...(sequenceNo !== undefined && { sequence_no: sequenceNo }),
    };
    const response = await get(API_ENDPOINTS.VIEW_LEAD, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const fetchPipeline = async ({ offset, limit, date, source, opportunity, customer, loginEmployeeId }) => {
  try {
    const queryParams = {
      offset,
      limit,
      ...(date !== undefined && { date: date }),
      ...(source !== undefined && { source_name: source }),
      ...(opportunity !== undefined && { opportunity_name: opportunity }),
      ...(customer !== undefined && { customer_name: customer }),
      ...(loginEmployeeId !== undefined && { login_employee_id: loginEmployeeId }),
    };
    const response = await get(API_ENDPOINTS.VIEW_PIPELINE, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const fetchVisitPlan = async ({ offset, limit, date, employeeId }) => {
  try {
    const queryParams = {
      offset,
      limit,
      date: date,
      ...(employeeId !== undefined && { employee_id: employeeId }),
    };
    const response = await get(API_ENDPOINTS.VIEW_VISIT_PLAN, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const fetchBoxInspectionReport = async ({ offset, limit }) => {
  try {
    const queryParams = {
      offset,
      limit,
    };
    const response = await get(API_ENDPOINTS.VIEW_BOX_INSPECTION_REPORT, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const fetchAttendance = async ({ userId, date }) => {
  try {
    const queryParams = {
      user_id: userId,
      date,
    };
    const response = await get(API_ENDPOINTS.VIEW_ATTENDANCE, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const fetchKPIDashboard = async ({ userId }) => {
  try {
    const queryParams = { login_employee_id: userId };
    const response = await get(API_ENDPOINTS.VIEW_KPI, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
}

export const fetchVehicles = async ({ offset, limit, searchText }) => {
  try {
    const queryParams = {
      offset,
      limit,
      ...(searchText !== undefined && { name: searchText }),
    };
    const response = await get(API_ENDPOINTS.VIEW_VEHICLES, queryParams);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

// Fetch full customer/partner details (address fields) by id from Odoo
export const fetchCustomerDetailsOdoo = async (partnerId) => {
  try {
    if (!partnerId) return null;
    const response = await axios.post(
      `${ODOO_BASE_URL}/web/dataset/call_kw`,
      {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'res.partner',
          method: 'search_read',
          args: [[['id', '=', partnerId]]],
          kwargs: {
            fields: ['id', 'name', 'street', 'street2', 'city', 'zip', 'country_id'],
            limit: 1,
          },
        },
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (response.data.error) {
      throw new Error('Odoo JSON-RPC error');
    }

    const results = response.data.result || [];
    const p = results[0];
    if (!p) return null;

    const address = [p.street, p.street2, p.city, p.zip, p.country_id && Array.isArray(p.country_id) ? p.country_id[1] : '']
      .filter(Boolean)
      .join(', ');

    return {
      id: p.id,
      name: p.name || '',
      address: address || null,
    };
  } catch (error) {
    throw error;
  }
};

// Create Account Payment for Odoo
export const createAccountPaymentOdoo = async ({ partnerId, journalId, amount, invoiceId = null } = {}) => {
  try {
    const params = {
      partner_id: partnerId,
      journal_id: journalId,
      amount,
      payment_type: 'inbound', // Customer payment
      partner_type: 'customer', // Payment from a customer
    };

    // Include invoice_ids to link the payment to the invoice
    if (invoiceId) {
      params.invoice_ids = [[6, 0, [invoiceId]]];
    }

    const payload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'account.payment',
        method: 'create',
        args: [params],
        kwargs: {},
      },
      id: new Date().getTime(),
    };

    const response = await fetch(`${ODOO_BASE_URL}web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    // Post the payment to finalize it
    if (result.result) {
      const paymentId = result.result;
      await fetch(`${ODOO_BASE_URL}web/dataset/call_kw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'account.payment',
            method: 'action_post',
            args: [[paymentId]],
            kwargs: {},
          },
          id: new Date().getTime(),
        }),
      });
    }

    return result;
  } catch (error) {
    return { error };
  }
};

// Fetch Payment Journals for Odoo
export const fetchPaymentJournalsOdoo = async () => {
  try {
    const response = await axios.post(
      `${ODOO_BASE_URL}/web/dataset/call_kw`,
      {
        jsonrpc: "2.0",
        method: "call",
        params: {
          model: "account.journal",
          method: "search_read",
          args: [[]],
          kwargs: {
            fields: ["id", "name", "type"],
            limit: 20,
          },
        },
      },
      { headers: { "Content-Type": "application/json" } }
    );
    if (response.data && response.data.result) return response.data.result;
    return [];
  } catch (error) {
    return [];
  }
};

// Create invoice (account.move) in Odoo
export const createInvoiceOdoo = async ({ partnerId, products = [], journalId = null, invoiceDate = null, reference = '' } = {}) => {
  try {
    if (!partnerId) throw new Error('partnerId is required');

    // Ensure we have a valid journal_id. If not provided, auto-select the sales journal.
    let finalJournalId = journalId;
    if (!finalJournalId) {
      try {
        const journals = await fetchPaymentJournalsOdoo();
        const salesJournal = journals.find(j => j.type === 'sale');
        if (salesJournal) {
          finalJournalId = salesJournal.id;
        } else {
        }
      } catch (err) {
      }
    }

    // Build invoice lines and log each line's tax/price
    let totalUntaxed = 0;
    let totalTax = 0;
    const invoice_lines = products.map((p) => {
      const price_unit = p.price || p.price_unit || p.list_price || 0;
      const quantity = p.quantity || p.qty || 1;
      const vals = {
        product_id: p.id,
        name: p.name || p.product_name || '',
        quantity,
        price_unit,
      };
      // taxes: if provided as array of ids
      if (p.tax_ids && Array.isArray(p.tax_ids) && p.tax_ids.length) {
        vals.tax_ids = [[6, 0, p.tax_ids]];
        // For diagnosis, log tax_ids
      }
      // For diagnosis, log price and quantity
      totalUntaxed += price_unit * quantity;
      // Note: Odoo will compute tax, but log if tax_ids present
      if (p.tax_ids && Array.isArray(p.tax_ids) && p.tax_ids.length) {
        // This is a placeholder; actual tax calculation is done by Odoo
        totalTax += 0; // You may add your own calculation if needed
      }
      return [0, 0, vals];
    });

    // Include journal_id only if we have a valid id (avoid sending null)
    const moveVals = {
      partner_id: partnerId,
      move_type: 'out_invoice',
      invoice_line_ids: invoice_lines,
    };
    if (finalJournalId) moveVals.journal_id = finalJournalId;
    if (invoiceDate) moveVals.invoice_date = invoiceDate;
    if (reference) moveVals.ref = reference;

    // Log computed totals before sending
    // Create the account.move record
    const createResp = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'account.move',
        method: 'create',
        args: [moveVals],
        kwargs: {},
      },
    }, { headers: { 'Content-Type': 'application/json' } });
    const createdId = createResp.data && createResp.data.result;
    // Fetch and log the created move record and its lines for diagnosis
    if (createdId) {
      try {
        const moveResp = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'account.move',
            method: 'search_read',
            args: [[['id', '=', createdId]]],
            kwargs: { fields: ['id', 'state', 'move_type', 'journal_id', 'invoice_date', 'payment_state', 'amount_total', 'amount_residual', 'company_id', 'partner_id', 'invoice_line_ids'] },
          },
          id: new Date().getTime(),
        }, { headers: { 'Content-Type': 'application/json' } });
      } catch (moveFetchErr) {
      }
      try {
        const linesResp = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'account.move.line',
            method: 'search_read',
            args: [[['move_id', '=', createdId]]],
            kwargs: { fields: ['id', 'move_id', 'product_id', 'name', 'quantity', 'price_unit', 'account_id', 'tax_ids'] },
          },
          id: new Date().getTime(),
        }, { headers: { 'Content-Type': 'application/json' } });
      } catch (linesFetchErr) {
      }
    }
    // Do not post the invoice here; leave it in draft state until explicitly posted later
    let posted = false;
    // Fetch final invoice status (payment_state, state, amount_residual, amount_total) for diagnostics
    let invoiceStatus = null;
    if (createdId) {
      try {
        const statusResp = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'account.move',
            method: 'search_read',
            args: [[['id', '=', createdId]]],
            kwargs: { fields: ['id', 'state', 'move_type', 'payment_state', 'amount_residual', 'amount_total', 'invoice_date'] },
          },
        }, { headers: { 'Content-Type': 'application/json' } });
        invoiceStatus = statusResp.data && statusResp.data.result && statusResp.data.result[0];
      } catch (statusErr) {
      }
    }

    return { id: createdId, posted, invoiceStatus };
  } catch (error) {
    throw error;
  }
};

// Link an account.move (invoice) to a pos.order and optionally set its state to a specific value
export const linkInvoiceToPosOrderOdoo = async ({ orderId, invoiceId, setState = true, state = null } = {}) => {
  try {
    if (!orderId) throw new Error('orderId is required');
    if (!invoiceId) throw new Error('invoiceId is required');

    // Only link the invoice, do not change the order state
    const vals = { account_move: invoiceId };

    const resp = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.order',
        method: 'write',
        args: [[orderId], vals],
        kwargs: {},
      },
    }, { headers: { 'Content-Type': 'application/json' } });

    // Verify update by reading the order
    try {
      const verify = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'pos.order',
          method: 'search_read',
          args: [[['id', '=', orderId]]],
          kwargs: { fields: ['id', 'state', 'account_move'] },
        },
      }, { headers: { 'Content-Type': 'application/json' } });
    } catch (verifyErr) {
    }

    return resp.data;
  } catch (error) {
    return { error };
  }
};

// Create POS order in Odoo via JSON-RPC
export const createPosOrderOdoo = async ({ partnerId = null, lines = [], sessionId = null, posConfigId = null, companyId = null, orderName = null, preset_id = 10, order_type = null } = {}) => {
  try {
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      throw new Error('lines are required to create pos order');
    }

    // Build lines entries for Odoo POS order
    const line_items = lines.map(l => {
      const price_unit = l.price || l.price_unit || l.list_price || 0;
      const qty = l.qty || l.quantity || 1;
      const subtotal = price_unit * qty;
      return [0, 0, {
        product_id: l.product_id || l.id,
        qty,
        price_unit,
        name: l.name || l.product_name || '',
        price_subtotal: subtotal,
        price_subtotal_incl: subtotal, // Quick fix: set equal to price_subtotal
      }];
    });

    // Calculate total
    const amount_total = lines.reduce((sum, l) => sum + (l.price || l.price_unit || l.list_price || 0) * (l.qty || l.quantity || 1), 0);
    const vals = {
      company_id: companyId || 1, // Default to 1 if not provided
      name: orderName || '/', // Use '/' for auto-generated name if not provided
      partner_id: partnerId || false,
      lines: line_items,
      amount_tax: 0,
      amount_total,
      amount_paid: amount_total,
      amount_return: 0,
      state: 'paid', // Set to 'paid' so Odoo auto-generates the order name
    };
    if (order_type) {
      try {
        // Only set order_type if server pos.order has this field (avoid Odoo crash)
        const hasField = await (async (field) => {
          try {
            if (!global.__pos_order_fields_cache) {
              const fieldsResp = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                  model: 'pos.order',
                  method: 'fields_get',
                  args: [],
                  kwargs: {},
                },
              }, { headers: { 'Content-Type': 'application/json' } });
              global.__pos_order_fields_cache = fieldsResp.data && fieldsResp.data.result ? Object.keys(fieldsResp.data.result) : [];
            }
            return Array.isArray(global.__pos_order_fields_cache) && global.__pos_order_fields_cache.includes(field);
          } catch (e) {
            return false;
          }
        })('order_type');
        if (hasField) vals.order_type = String(order_type).toUpperCase();
      } catch (e) {
        // ignore - do not send unsupported field
      }
    }
    if (sessionId) vals.session_id = sessionId;
    if (posConfigId) vals.config_id = posConfigId;
    if (typeof preset_id !== 'undefined') vals.preset_id = preset_id;

    const response = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.order',
        method: 'create',
        args: [vals],
        kwargs: {},
      },
    }, { headers: { 'Content-Type': 'application/json' } });

    if (response.data && response.data.error) {
      return { error: response.data.error };
    }

    const createdId = response.data.result;
    // Immediately validate the order to trigger name generation
    const validateResp = await validatePosOrderOdoo(createdId);
    if (validateResp && validateResp.error) {
      // Still return createdId so payment can proceed
      return { result: createdId, error: validateResp.error };
    }
    return { result: createdId };
  } catch (error) {
    return { error };
  }
};

// Create POS payment(s) in Odoo via JSON-RPC
// Accepts either a single payment or an array of payments
export const createPosPaymentOdoo = async ({ orderId, payments, amount, journalId, paymentMethodId, paymentMode = 'cash', partnerId = null, sessionId = null, companyId = null } = {}) => {
  try {
    if (!orderId) throw new Error('orderId is required');

    // Support both legacy (amount) and new (payments array) API
    let paymentRecords = [];
    if (Array.isArray(payments) && payments.length > 0) {
      paymentRecords = payments;
    } else if (typeof amount !== 'undefined') {
      paymentRecords = [{ amount: Number(amount), journalId, paymentMethodId, paymentMode }];
    } else {
      throw new Error('No payment(s) provided');
    }

    const results = [];
    for (const payment of paymentRecords) {
      const amt = Number(payment.amount) || 0;
      if (amt === 0) continue; // Skip zero payments

      let finalPaymentMethodId = payment.paymentMethodId || paymentMethodId;
      let finalJournalId = payment.journalId || journalId;
      let finalPaymentMode = payment.paymentMode || paymentMode;

      // If paymentMethodId is not provided, fetch it using journalId
      if (!finalPaymentMethodId) {
        if (!finalJournalId) throw new Error('paymentMethodId or journalId is required');
        const pmResp = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            model: 'pos.payment.method',
            method: 'search_read',
            args: [[['journal_id', '=', finalJournalId]]],
            kwargs: { fields: ['id', 'name', 'journal_id'], limit: 1 },
          },
        }, { headers: { 'Content-Type': 'application/json' } });
        finalPaymentMethodId = pmResp.data?.result?.[0]?.id;
        if (!finalPaymentMethodId) {
          return { error: { message: 'No payment_method_id found for journalId ' + finalJournalId } };
        }
      }

      const paymentVals = {
        pos_order_id: orderId,
        amount: amt,
        payment_method_id: finalPaymentMethodId,
        partner_id: partnerId || false,
        session_id: sessionId || false,
        company_id: companyId || 1, // Corrected `CompanyId` to `companyId`
      };

      const response = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'pos.payment',
          method: 'create',
          args: [paymentVals],
          kwargs: {},
        },
      }, { headers: { 'Content-Type': 'application/json' } });

      if (response.data && response.data.error) {
        results.push({ error: response.data.error });
      } else {
        results.push({ result: response.data.result });
      }
    }
    return { results };
  } catch (error) {
    return { error };
  }
};

// Create a new POS session in Odoo
export const createPOSSesionOdoo = async ({ configId, userId }) => {
  try {
    if (!configId) throw new Error('configId is required');
    const vals = {
      config_id: configId,
      user_id: userId || false,
    };
    const response = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.session',
        method: 'create',
        args: [vals],
        kwargs: {},
      },
    }, { headers: { 'Content-Type': 'application/json' } });
    if (response.data && response.data.error) {
      return { error: response.data.error };
    }
    return { result: response.data.result };
  } catch (error) {
    return { error };
  }
};

// Fetch restaurant tables from Odoo using JSON-RPC

export const fetchRestaurantTablesOdoo = async () => {
  try {
    // Import the default Odoo DB name
    const { DEFAULT_ODOO_DB, DEFAULT_ODOO_BASE_URL } = require('../config/odooConfig');
    const response = await fetch(`${DEFAULT_ODOO_BASE_URL}web/dataset/call_kw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Odoo-Database': DEFAULT_ODOO_DB,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'restaurant.table',
          method: 'search_read',
          args: [[]], // No filter, fetch all tables
          kwargs: { fields: [
            'id', 'table_number', 'display_name', 'floor_id', 'seats', 'shape',
            'position_h', 'position_v', 'width', 'height', 'color', 'active'
          ] }
        },
        id: new Date().getTime(),
      }),
    });
    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      return { error: parseErr, raw: rawText };
    }
    if (data.error) {
      return { error: data.error };
    }
    return { result: data.result };
  } catch (error) {
    return { error };
  }
};

// Fetch open POS orders for a given table id
export const fetchOpenOrdersByTable = async (tableId) => {
  try {
    if (!tableId) return { result: [] };
    // Exclude orders that are in final/closed states so only active/draft orders are returned
    // Include common closing states used across Odoo versions: done, cancel, paid, receipt, invoiced, posted
    const closedStates = ['done', 'cancel', 'paid', 'receipt', 'invoiced', 'posted'];
    const response = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.order',
        method: 'search_read',
        args: [[['table_id', '=', tableId], ['state', 'not in', closedStates]]],
        kwargs: { fields: ['id', 'name', 'state', 'amount_total', 'table_id', 'lines'] },
      },
      id: new Date().getTime(),
    }, { headers: { 'Content-Type': 'application/json' } });
    if (response.data && response.data.error) {
      return { error: response.data.error };
    }
    return { result: response.data.result };
  } catch (error) {
    return { error };
  }
};

// Create a draft pos.order assigned to a table
export const createDraftPosOrderOdoo = async ({ sessionId, userId, tableId, partnerId = false, note = '', preset_id = 10, order_type = null } = {}) => {
  try {
    const vals = {
      session_id: sessionId,
      user_id: userId || false,
      partner_id: partnerId || false,
      table_id: tableId || false,
      lines: [],
      internal_note: note,
      amount_tax: 0,
      amount_total: 0,
      amount_paid: 0,
      amount_return: 0,
      state: 'draft',
      preset_id: preset_id,
    };
    if (order_type) {
      try {
        const hasField = await (async (field) => {
          try {
            if (!global.__pos_order_fields_cache) {
              const fieldsResp = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                  model: 'pos.order',
                  method: 'fields_get',
                  args: [],
                  kwargs: {},
                },
              }, { headers: { 'Content-Type': 'application/json' } });
              global.__pos_order_fields_cache = fieldsResp.data && fieldsResp.data.result ? Object.keys(fieldsResp.data.result) : [];
            }
            return Array.isArray(global.__pos_order_fields_cache) && global.__pos_order_fields_cache.includes(field);
          } catch (e) {
            return false;
          }
        })('order_type');
        if (hasField) vals.order_type = String(order_type).toUpperCase();
      } catch (e) {
        // ignore
      }
    }
    const response = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.order',
        method: 'create',
        args: [vals],
        kwargs: {},
      },
      id: new Date().getTime(),
    }, { headers: { 'Content-Type': 'application/json' } });
    if (response.data && response.data.error) {
      return { error: response.data.error };
    }
    // response.data.result is the new record id
    const createdId = response.data.result;
    // Try to fetch the full created order record for logging (non-blocking for callers)
    try {
      const full = await fetchPosOrderById(createdId);
      if (full && full.result) {
      } else {
      }
    } catch (fetchErr) {
    }
    return { result: createdId };
  } catch (error) {
    return { error };
  }
};

// Add a line to an existing pos.order using the correct 'lines' field
export const addLineToOrderOdoo = async ({ orderId, productId, qty = 1, price_unit = 0, name = '', taxes = [] } = {}) => {
  try {
    if (!orderId) throw new Error('orderId is required');
    if (!productId) throw new Error('productId is required');

    const qtyNum = Number(qty) || 1;
    const priceNum = Number(price_unit) || 0;
    const subtotal = qtyNum * priceNum;

    const lineVals = {
      product_id: productId,
      qty: qtyNum,
      price_unit: priceNum,
      name: name || '',
      price_subtotal: subtotal,
      price_subtotal_incl: subtotal,
    };
    if (Array.isArray(taxes) && taxes.length > 0) {
      lineVals.tax_ids = taxes.map(t => typeof t === 'number' ? t : (t.id || t[0] || null)).filter(Boolean);
    }

    const rpcPayload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.order',
        method: 'write',
        args: [[orderId], { lines: [[0, 0, lineVals]] }],
        kwargs: {},
      },
      id: new Date().getTime(),
    };
    const response = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, rpcPayload, { headers: { 'Content-Type': 'application/json' } });

    if (response.data && response.data.error) {
      return { error: response.data.error };
    }

    // After adding line, recalculate order totals
    await recomputePosOrderTotals(orderId);

    return { result: response.data.result };
  } catch (error) {
    return { error };
  }
};

// Fetch all open POS orders (not done) optionally filtered by session or limit
export const fetchOpenOrders = async ({ sessionId = null, limit = 100 } = {}) => {
  try {
    const domain = [['state', '!=', 'done']];
    if (sessionId) domain.push(['session_id', '=', sessionId]);
    const response = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.order',
        method: 'search_read',
        args: [domain],
        kwargs: { fields: ['id', 'name', 'state', 'amount_total', 'table_id', 'create_date'], limit, order: 'create_date desc' },
      },
      id: new Date().getTime(),
    }, { headers: { 'Content-Type': 'application/json' } });
    if (response.data && response.data.error) {
      return { error: response.data.error };
    }
    return { result: response.data.result };
  } catch (error) {
    return { error };
  }
};

// Fetch orders without filtering out done orders (flexible fetch)
export const fetchOrders = async ({ sessionId = null, limit = 100, order = 'create_date desc', fields = null } = {}) => {
  try {
    const domain = [];
    if (sessionId) domain.push(['session_id', '=', sessionId]);
    const useFields = Array.isArray(fields) && fields.length > 0 ? fields : ['id', 'name', 'state', 'amount_total', 'table_id', 'create_date'];

    const response = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.order',
        method: 'search_read',
        args: [domain],
        kwargs: { fields: useFields, limit, order },
      },
      id: new Date().getTime(),
    }, { headers: { 'Content-Type': 'application/json' } });

    if (response.data && response.data.error) {
      return { error: response.data.error };
    }
    return { result: response.data.result };
  } catch (error) {
    return { error };
  }
};

// Fetch a single pos.order by id (includes `lines` which are line ids)
export const fetchPosOrderById = async (orderId) => {
  try {
    if (!orderId) return { result: null };
    const response = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.order',
        method: 'search_read',
        args: [[['id', '=', orderId]]],
        // include preset_id so clients can read the selected preset on the order
        kwargs: { fields: ['id','name','state','amount_total','table_id','lines','create_date','user_id','partner_id','preset_id'] },
      },
      id: new Date().getTime(),
    }, { headers: { 'Content-Type': 'application/json' } });

    if (response.data && response.data.error) {
      return { error: response.data.error };
    }
    const result = (response.data.result && response.data.result[0]) || null;
    return { result };
  } catch (error) {
    return { error };
  }
};

// Fetch pos.order.line records for given line ids
export const fetchOrderLinesByIds = async (lineIds = []) => {
  try {
    if (!Array.isArray(lineIds) || lineIds.length === 0) return { result: [] };
    const response = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.order.line',
        method: 'search_read',
        args: [[['id', 'in', lineIds]]],
        kwargs: { fields: ['id','product_id','qty','price_unit','price_subtotal','price_subtotal_incl','tax_ids','discount','name'] },
      },
      id: new Date().getTime(),
    }, { headers: { 'Content-Type': 'application/json' } });

    if (response.data && response.data.error) {
      return { error: response.data.error };
    }
    return { result: response.data.result || [] };
  } catch (error) {
    return { error };
  }
};

// Fetch pos.preset records (POS presets like Dine In / Takeaway)
export const fetchPosPresets = async ({ limit = 200 } = {}) => {
  try {
    const response = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.preset',
        method: 'search_read',
        args: [[]],
        kwargs: { fields: ['id','name','available_in_self','use_guest','pricelist_id','color','image_128'], limit, order: 'id asc' },
      },
      id: new Date().getTime(),
    }, { headers: { 'Content-Type': 'application/json' } });

    if (response.data && response.data.error) {
      return { error: response.data.error };
    }
    return { result: response.data.result };
  } catch (error) {
    return { error };
  }
};

// Force recalculation of pos.order totals after line changes
export const recomputePosOrderTotals = async (orderId) => {
  try {
    if (!orderId) throw new Error('orderId is required');
    
    // Fetch all order lines to calculate totals
    const orderResponse = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.order',
        method: 'search_read',
        args: [[['id', '=', orderId]]],
        kwargs: { fields: ['id', 'lines'] },
      },
      id: new Date().getTime(),
    }, { headers: { 'Content-Type': 'application/json' } });

    if (orderResponse.data && orderResponse.data.error) {
      return { error: orderResponse.data.error };
    }

    const order = orderResponse.data.result?.[0];
    if (!order || !order.lines || order.lines.length === 0) {
      // Update order with 0 total
      await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model: 'pos.order',
          method: 'write',
          args: [[orderId], { amount_total: 0, amount_tax: 0, amount_paid: 0 }],
          kwargs: {},
        },
        id: new Date().getTime(),
      }, { headers: { 'Content-Type': 'application/json' } });
      return { result: true };
    }

    // Fetch all line details
    const linesResponse = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.order.line',
        method: 'search_read',
        args: [[['id', 'in', order.lines]]],
        kwargs: { fields: ['id', 'qty', 'price_unit', 'price_subtotal', 'price_subtotal_incl', 'discount'] },
      },
      id: new Date().getTime(),
    }, { headers: { 'Content-Type': 'application/json' } });

    if (linesResponse.data && linesResponse.data.error) {
      return { error: linesResponse.data.error };
    }

    const lines = linesResponse.data.result || [];
    let totalAmount = 0;
    let totalTax = 0;

    // Calculate totals from lines
    lines.forEach(line => {
      const qty = Number(line.qty) || 0;
      const priceUnit = Number(line.price_unit) || 0;
      const discount = Number(line.discount) || 0;
      
      // Calculate line subtotal with discount
      let lineSubtotal = qty * priceUnit;
      if (discount > 0) {
        lineSubtotal = lineSubtotal * (1 - discount / 100);
      }
      
      totalAmount += lineSubtotal;
      // For now, assume no separate tax (can be enhanced later)
      totalTax += 0;
    });

    // Update the order with calculated totals
    const updateResponse = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.order',
        method: 'write',
        args: [[orderId], { 
          amount_total: totalAmount,
          amount_tax: totalTax,
          amount_paid: totalAmount  // Set amount_paid equal to amount_total for now
        }],
        kwargs: {},
      },
      id: new Date().getTime(),
    }, { headers: { 'Content-Type': 'application/json' } });

    if (updateResponse.data && updateResponse.data.error) {
      return { error: updateResponse.data.error };
    }

    return { result: true };
  } catch (error) {
    return { error };
  }
};

// Update an existing pos.order.line (qty, price_unit, name, etc.)
export const updateOrderLineOdoo = async ({ lineId, qty, price_unit, name, orderId = null } = {}) => {
  try {
    if (!lineId) throw new Error('lineId is required');
    const vals = {};
    if (typeof qty !== 'undefined') vals.qty = Number(qty);
    if (typeof price_unit !== 'undefined') {
      vals.price_unit = Number(price_unit);
      // Recalculate subtotals when price_unit changes
      if (typeof qty !== 'undefined') {
        vals.price_subtotal = Number(qty) * Number(price_unit);
        vals.price_subtotal_incl = Number(qty) * Number(price_unit);
      }
    }
    if (typeof name !== 'undefined') vals.name = name;

    const rpcPayload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.order.line',
        method: 'write',
        args: [[lineId], vals],
        kwargs: {},
      },
      id: new Date().getTime(),
    };
    const response = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, rpcPayload, { headers: { 'Content-Type': 'application/json' } });

    if (response.data && response.data.error) {
      return { error: response.data.error };
    }
    
    // After updating line, recalculate order totals if orderId provided
    if (orderId) {
      await recomputePosOrderTotals(orderId);
    }
    
    return { result: response.data.result };
  } catch (error) {
    return { error };
  }
};

// Remove (unlink) a pos.order.line by id
export const removeOrderLineOdoo = async ({ lineId, orderId = null } = {}) => {
  try {
    if (!lineId) throw new Error('lineId is required');
    const rpcPayload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'pos.order.line',
        method: 'unlink',
        args: [[lineId]],
        kwargs: {},
      },
      id: new Date().getTime(),
    };
    const response = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, rpcPayload, { headers: { 'Content-Type': 'application/json' } });

    if (response.data && response.data.error) {
      return { error: response.data.error };
    }
    
    // After removing line, recalculate order totals if orderId provided
    if (orderId) {
      await recomputePosOrderTotals(orderId);
    }
    
    return { result: response.data.result };
  } catch (error) {
    return { error };
  }
};

// Fetch selection values for a given model field (e.g., pos.order state selection)
export const fetchFieldSelectionOdoo = async ({ model = '', field = '' } = {}) => {
  try {
    if (!model || !field) throw new Error('model and field are required');
    const response = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model,
        method: 'fields_get',
        args: [[field]],
        kwargs: { attributes: ['selection'] },
      },
    }, { headers: { 'Content-Type': 'application/json' } });

    if (response.data && response.data.error) {
      return [];
    }

    const fieldDef = response.data && response.data.result && response.data.result[field];
    if (!fieldDef) return [];
    return fieldDef.selection || [];
  } catch (error) {
    return [];
  }
};

// Post an invoice to assign an official number
export const postInvoiceOdoo = async (invoiceId) => {
  try {
    if (!invoiceId) throw new Error('invoiceId is required');
    const resp = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'account.move',
        method: 'action_post',
        args: [[invoiceId]],
        kwargs: {},
      },
    }, { headers: { 'Content-Type': 'application/json' } });

    if (resp.data && resp.data.error) {
      return { error: resp.data.error };
    }
    // fetch posted invoice to get number/name
    const info = await axios.post(`${ODOO_BASE_URL}/web/dataset/call_kw`, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'account.move',
        method: 'search_read',
        args: [[['id', '=', invoiceId]]],
        kwargs: { fields: ['id', 'name', 'state', 'payment_state', 'amount_total', 'amount_residual'] },
      },
    }, { headers: { 'Content-Type': 'application/json' } });
    const meta = (info.data && info.data.result && info.data.result[0]) || null;
    return { result: meta };
  } catch (error) {
    return { error };
  }
};