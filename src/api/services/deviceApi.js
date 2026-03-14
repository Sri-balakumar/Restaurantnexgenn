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
 * Tries multiple endpoints — never throws (returns [] on any failure).
 * @param {string} baseUrl
 * @returns {Promise<string[]>} array of database names
 */
export async function fetchDatabases(baseUrl) {
  const base = normalizeUrl(baseUrl);
  const opts = { headers: JSONRPC_HEADERS, timeout: TIMEOUT_MS };
  let lastError = null;

  // 1️⃣ Try custom module endpoint first
  try {
    const res = await axios.post(`${base}/device/databases`, jsonrpcBody({}), opts);
    const dbs = res.data?.result?.databases;
    if (Array.isArray(dbs) && dbs.length > 0) return dbs;
  } catch (err) {
    console.warn('[fetchDatabases] /device/databases failed:', err.message);
    lastError = err;
  }

  // 2️⃣ Try Odoo's built-in /web/database/list (all Odoo versions)
  try {
    const res = await axios.post(`${base}/web/database/list`, jsonrpcBody({}), opts);
    // Check for JSON-RPC error in response (e.g. list_db=False config)
    if (res.data?.error) throw new Error(res.data.error.data?.message || 'list disabled');
    const result = res.data?.result;
    if (Array.isArray(result) && result.length > 0) return result;
    if (Array.isArray(result?.databases) && result.databases.length > 0) return result.databases;
  } catch (err) {
    console.warn('[fetchDatabases] /web/database/list POST failed:', err.message);
    lastError = err;
  }

  // 3️⃣ Try /web/database/list as a plain GET (some proxy setups)
  try {
    const res = await axios.get(`${base}/web/database/list`, { timeout: TIMEOUT_MS });
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data?.result)) return res.data.result;
  } catch (err) {
    console.warn('[fetchDatabases] /web/database/list GET failed:', err.message);
    lastError = err;
  }

  // All attempts failed — throw so caller can show the actual reason
  if (lastError) throw lastError;
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

/**
 * Register device via QR scan — creates/updates device.registry record.
 * Called after app scans the QR shown in Odoo New Device form.
 * @param {{ baseUrl: string, databaseName: string, deviceId: string, deviceName: string }}
 * @returns {Promise<{ status: 'registered'|'already_registered'|'blocked'|'error' }>}
 */
export async function registerFromScan({ baseUrl, databaseName, deviceId, deviceName, recordId }) {
  const base = normalizeUrl(baseUrl);
  const res = await axios.post(
    `${base}/device/register-from-scan`,
    jsonrpcBody({
      device_id: deviceId,
      device_name: deviceName || 'NexGen Restaurant App',
      database_name: databaseName,
      base_url: base,
      record_id: recordId || null,
    }),
    { headers: JSONRPC_HEADERS, timeout: TIMEOUT_MS }
  );
  return res.data?.result || { status: 'error', message: 'Empty response from server' };
}

/**
 * Authenticate with Odoo and return session info.
 * @param {string} baseUrl
 * @param {string} db
 * @param {string} login
 * @param {string} password
 * @returns {Promise<{ uid: number|false, session_id?: string }>}
 */
export async function authenticate(baseUrl, db, login, password) {
  const base = normalizeUrl(baseUrl);
  const res = await axios.post(
    `${base}/web/session/authenticate`,
    jsonrpcBody({ db, login, password }),
    { headers: JSONRPC_HEADERS, timeout: TIMEOUT_MS }
  );
  return res.data?.result || { uid: false };
}

/**
 * Check if a module is installed in the given Odoo database.
 * Requires an authenticated session (call authenticate first).
 * @param {string} baseUrl
 * @param {string} db
 * @param {number} uid
 * @param {string} password
 * @param {string} moduleName
 * @returns {Promise<boolean>}
 */
export async function isModuleInstalled(baseUrl, db, uid, password, moduleName) {
  const base = normalizeUrl(baseUrl);
  const res = await axios.post(
    `${base}/jsonrpc`,
    {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          db,
          uid,
          password,
          'ir.module.module',
          'search_count',
          [[['name', '=', moduleName], ['state', '=', 'installed']]],
        ],
      },
    },
    { headers: JSONRPC_HEADERS, timeout: TIMEOUT_MS }
  );
  return (res.data?.result || 0) > 0;
}

/**
 * Step 1 — Check if this device UUID is pre-registered in Odoo.
 * Admin must have created a device.registry record with mac_address = deviceUUID.
 *
 * Response: { status: 'found'|'not_found'|'error', device_name?, device_status? }
 * @param {string} baseUrl
 * @param {string} deviceUUID  — the app's persistent UUID (sent as mac_address)
 * @param {string} databaseName
 */
export async function lookupDevice(baseUrl, deviceUUID, databaseName) {
  const base = normalizeUrl(baseUrl);
  const res = await axios.post(
    `${base}/device/lookup`,
    jsonrpcBody({ mac_address: deviceUUID, database_name: databaseName }),
    { headers: JSONRPC_HEADERS, timeout: TIMEOUT_MS }
  );
  return res.data?.result || { status: 'error', message: 'Empty response from server' };
}

/**
 * Step 2 — Activate a pre-registered device (link UUID, mark Active).
 * Call only after lookupDevice returns status='found'.
 *
 * Response: { status: 'activated'|'already_active'|'blocked'|'not_found'|'error' }
 * @param {string} baseUrl
 * @param {string} deviceUUID
 * @param {string} databaseName
 */
export async function activateDevice(baseUrl, deviceUUID, databaseName) {
  const base = normalizeUrl(baseUrl);
  const res = await axios.post(
    `${base}/device/activate`,
    jsonrpcBody({
      mac_address: deviceUUID,
      database_name: databaseName,
      device_id: deviceUUID,
      base_url: base,
    }),
    { headers: JSONRPC_HEADERS, timeout: TIMEOUT_MS }
  );
  return res.data?.result || { status: 'error', message: 'Empty response from server' };
}
