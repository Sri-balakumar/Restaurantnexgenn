// src/api/services/odooAuth.js
import axios from 'axios';
import { DEFAULT_ODOO_DB, DEFAULT_ODOO_BASE_URL } from '../config/odooConfig';

/**
 * Authenticate to Odoo using JSON-RPC and return session info.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object>} Session info or error
 */
export const odooLogin = async (username, password) => {
  try {
    const url = `${DEFAULT_ODOO_BASE_URL.replace(/\/$/, '')}/web/session/authenticate`;
    const response = await axios.post(
      url,
      {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          db: DEFAULT_ODOO_DB,
          login: username,
          password: password,
        },
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (response.data && response.data.result && response.data.result.uid) {
      return { success: true, session: response.data.result };
    } else {
      return { success: false, error: response.data.error || 'Login failed' };
    }
  } catch (error) {
    return { success: false, error };
  }
};
