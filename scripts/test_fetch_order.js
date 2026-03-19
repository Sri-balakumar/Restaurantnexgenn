// Usage: node scripts/test_fetch_order.js <baseUrl> <db> <username> <password> [orderId]
// If orderId is provided, fetch that order; otherwise list recent orders.

const axios = require('axios');

const [,, baseUrlRaw, db, username, password, orderId] = process.argv;
if (!baseUrlRaw || !db || !username || !password) {
  console.error('Usage: node scripts/test_fetch_order.js <baseUrl> <db> <username> <password> [orderId]');
  process.exit(2);
}

const baseUrl = baseUrlRaw.replace(/\/$/, '');

(async () => {
  try {
    // Authenticate
    const authUrl = `${baseUrl}/web/session/authenticate`;
    const authPayload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        db,
        login: username,
        password,
      },
    };
    const authResp = await axios.post(authUrl, authPayload, { headers: { 'Content-Type': 'application/json' }, withCredentials: true });
    if (!authResp.data || !authResp.data.result) {
      console.error('Auth failed:', JSON.stringify(authResp.data || authResp.statusText));
      process.exit(1);
    }
    const setCookie = authResp.headers['set-cookie'] || authResp.headers['Set-Cookie'];
    let sessionId = null;
    if (setCookie && Array.isArray(setCookie) && setCookie.length > 0) {
      const s = setCookie[0];
      const m = s.match(/session_id=([^;]+)/);
      if (m) sessionId = m[1];
    }
    console.log('Authenticated uid:', authResp.data.result.uid, 'session_id:', sessionId);

    // Helper to call call_kw
    const callKw = async (model, method, args = [], kwargs = {}) => {
      const url = `${baseUrl}/web/dataset/call_kw`;
      const payload = {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model,
          method,
          args,
          kwargs,
        },
        id: new Date().getTime(),
      };
      const headers = { 'Content-Type': 'application/json' };
      if (sessionId) headers['Cookie'] = `session_id=${sessionId}`;
      const resp = await axios.post(url, payload, { headers });
      return resp.data;
    };

    if (orderId) {
      console.log('Fetching order id', orderId);
      const res = await callKw('pos.order', 'search_read', [[['id','=',Number(orderId)]]], { fields: ['id','name','state','amount_total','table_id','lines','create_date','user_id','partner_id'] });
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    } else {
      console.log('Listing recent orders (limit 20)');
      const res = await callKw('pos.order', 'search_read', [[]], { fields: ['id','name','state','amount_total','table_id','lines','create_date','user_id','partner_id'], limit: 20, order: 'create_date desc' });
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    }
  } catch (err) {
    console.error('Error:', err.response ? err.response.data || err.response.statusText : err.message);
    process.exit(3);
  }
})();
