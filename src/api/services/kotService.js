/**
 * KOT Service for React Native + Odoo
 * Uses existing Odoo session from app (no double login)
 */

let CONFIG = {
  odooUrl: '',
  database: '',
  uid: null,
  password: '',
  printerIp: '',
  printerPort: 9100,
};

/**
 * Setup configuration and session info
 * @param {object} config - { odooUrl, database, uid, password, printerIp, printerPort }
 */
export function setup(config) {
  CONFIG = { ...CONFIG, ...config };
}

/**
 * PRINT KOT - Direct method
 * @param {object} kotData - KOT data to print
 */
export async function printKot(kotData) {
  if (!CONFIG.uid) {
    return { success: false, error: 'Not logged in' };
  }

  const data = {
    printer_ip: CONFIG.printerIp,
    printer_port: CONFIG.printerPort,
    table_name: kotData.table_name || '',
    order_name: kotData.order_name || '',
    cashier: kotData.cashier || '',
    items: kotData.items || [],
  };
    // Include order_type if provided (raw and a human-friendly label)
    if (kotData.order_type) {
      const ot = String(kotData.order_type || '');
      data.order_type = ot;
      // map common tokens to a friendly label for printers
      if (ot === 'TAKEAWAY' || ot === 'TAKEOUT') data.order_type_label = 'Takeout';
      else if (ot === 'DINEIN' || ot === 'DINE_IN') data.order_type_label = 'Dine In';
      else data.order_type_label = ot.charAt(0).toUpperCase() + ot.slice(1).toLowerCase();
    }

  try {
    const response = await fetch(`${CONFIG.odooUrl}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            CONFIG.database,
            CONFIG.uid,
            CONFIG.password,
            'pos.kot.print',
            'print_kot',
            [data],
            {},
          ],
        },
        id: 2,
      }),
    });

    const result = await response.json();
    if (result.error) {
      return { success: false, error: result.error.data?.message || 'API Error' };
    }
    return result.result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get tables list
 */
export async function getTables() {
  if (!CONFIG.uid) {
    return { success: false, error: 'Not logged in' };
  }
  try {
    const response = await fetch(`${CONFIG.odooUrl}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            CONFIG.database,
            CONFIG.uid,
            CONFIG.password,
            'restaurant.table',
            'search_read',
            [[]],
            { fields: ['id', 'name', 'seats'] },
          ],
        },
        id: 3,
      }),
    });
    const data = await response.json();
    if (data.error) {
      return { success: false, error: data.error.data?.message || 'API Error' };
    }
    return { success: true, tables: data.result || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get products list
 */
export async function getProducts() {
  if (!CONFIG.uid) {
    return { success: false, error: 'Not logged in' };
  }
  try {
    const response = await fetch(`${CONFIG.odooUrl}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'object',
          method: 'execute_kw',
          args: [
            CONFIG.database,
            CONFIG.uid,
            CONFIG.password,
            'product.product',
            'search_read',
            [[['available_in_pos', '=', true]]],
            { fields: ['id', 'name', 'display_name', 'list_price'], limit: 100 },
          ],
        },
        id: 4,
      }),
    });
    const data = await response.json();
    if (data.error) {
      return { success: false, error: data.error.data?.message || 'API Error' };
    }
    return { success: true, products: data.result || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default {
  setup,
  printKot,
  getTables,
  getProducts,
};
