// src/api/services/deviceApi.js
// Wraps all Odoo device_login_config endpoints.
// All endpoints are JSON-RPC, auth='none', no CSRF required.

import axios from 'axios';

const JSONRPC_HEADERS = { 'Content-Type': 'application/json' };
const TIMEOUT_MS = 10000; // 10 second timeout for all device API calls

function normalizeUrl(baseUrl = '') {
  let url = baseUrl.trim();
  // Prepend http:// if no protocol present
  if (url && !url.startsWith('http')) {
    url = 'http://' + url;
  }
  // Remove trailing slash(es)
  return url.replace(/\/+$/, '');
}

function jsonrpcBody(params) {
  return { jsonrpc: '2.0', method: 'call', params };
}

/**
 * Fetch available databases from the Odoo server.
 * Tries the custom /device/databases endpoint first, then falls back to
 * Odoo's built-in /web/database/list endpoint which works on ALL Odoo installs.
 * @param {string} baseUrl
 * @returns {Promise<string[]>} array of database names
 */
export async function fetchDatabases(baseUrl) {
  const base = normalizeUrl(baseUrl);
  const opts = { headers: JSONRPC_HEADERS, timeout: TIMEOUT_MS };

  // 1️⃣ Try custom module endpoint first
  try {
    const res = await axios.post(`${base}/device/databases`, jsonrpcBody({}), opts);
    const dbs = res.data?.result?.databases;
    if (Array.isArray(dbs) && dbs.length > 0) return dbs;
  } catch (_) {
    // fall through to built-in endpoint
  }

  // 2️⃣ Fall back to Odoo's built-in database list (works on all Odoo 16/17/18/19)
  const res = await axios.post(`${base}/web/database/list`, jsonrpcBody({}), opts);
  const result = res.data?.result;
  // /web/database/list returns the array directly as result
  if (Array.isArray(result)) return result;
  // Some Odoo versions wrap it
  if (Array.isArray(result?.databases)) return result.databases;
  return [];
}

/**
 * Unified startup/registration endpoint.
 * - Already registered → { registered: true }
 * - New device, auto-registered → { registered: false, just_registered: true }
 * - Error → { registered: false, error: "..." }
 * @param {{ baseUrl: string, databaseName: string, deviceId: string, deviceName: string }}
 * @returns {Promise<object>}
 */
export async function initDevice({ baseUrl, databaseName, deviceId, deviceName }) {
  const url = `${normalizeUrl(baseUrl)}/device/init`;
  const res = await axios.post(
    url,
    jsonrpcBody({
      base_url: normalizeUrl(baseUrl),
      database_name: databaseName,
      device_id: deviceId,
      device_name: deviceName || 'NexGen Restaurant App',
    }),
    { headers: JSONRPC_HEADERS, timeout: TIMEOUT_MS }
  );
  return res.data?.result || { registered: false, error: 'Empty response from server' };
}

/**
 * Check if a device is already registered.
 * @param {{ baseUrl: string, deviceId: string, databaseName: string }}
 * @returns {Promise<{ registered: boolean }>}
 */
export async function checkDevice({ baseUrl, deviceId, databaseName }) {
  const url = `${normalizeUrl(baseUrl)}/device/check`;
  const res = await axios.post(
    url,
    jsonrpcBody({ device_id: deviceId, database_name: databaseName }),
    { headers: JSONRPC_HEADERS }
  );
  return res.data?.result || { registered: false };
}

/**
 * Register an app device explicitly (alternative to initDevice).
 * @param {{ baseUrl: string, databaseName: string, deviceId: string, deviceName: string }}
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function registerDevice({ baseUrl, databaseName, deviceId, deviceName }) {
  const url = `${normalizeUrl(baseUrl)}/device/register/app`;
  const res = await axios.post(
    url,
    jsonrpcBody({
      base_url: normalizeUrl(baseUrl),
      database_name: databaseName,
      device_id: deviceId,
      device_name: deviceName || 'NexGen Restaurant App',
    }),
    { headers: JSONRPC_HEADERS }
  );
  return res.data?.result || { success: false, error: 'Empty response from server' };
}
