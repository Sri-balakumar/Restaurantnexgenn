// src/api/services/deviceRegistryApi.js
// Fetches device.registry records from Odoo for the in-app Device Registry screen.

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Fetch all device.registry records from Odoo.
 * Requires an active session (user must be logged in).
 * @returns {Promise<Array>} array of device registry records
 */
export async function fetchDeviceRegistry() {
  const pairs = await AsyncStorage.multiGet(['device_server_url', 'odoo_session_id']);
  const serverUrl = pairs[0][1];
  const sessionId = pairs[1][1];

  if (!serverUrl) {
    throw new Error('No server URL configured. Complete device setup first.');
  }
  if (!sessionId) {
    throw new Error('Not logged in. Please log in first.');
  }

  const base = serverUrl.replace(/\/+$/, '');

  // Send session via both Cookie and X-Openerp-Session-Id (Odoo 17+ prefers the header)
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': `session_id=${sessionId}`,
    'X-Openerp-Session-Id': sessionId,
  };

  const res = await axios.post(
    `${base}/web/dataset/call_kw`,
    {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        model: 'device.registry',
        method: 'search_read',
        args: [[]],
        kwargs: {
          fields: ['device_name', 'device_id', 'base_url', 'database_name', 'last_login'],
          order: 'last_login desc',
          limit: 100,
          context: {},
        },
      },
    },
    { headers, timeout: 10000 }
  );

  if (res.data?.error) {
    const msg = res.data.error.data?.message || res.data.error.message || 'Odoo error';
    throw new Error(msg);
  }

  return res.data?.result || [];
}
