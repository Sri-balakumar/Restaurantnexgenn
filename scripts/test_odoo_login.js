// Simple Odoo login tester
// Usage: node scripts/test_odoo_login.js <baseUrl> <db> <username> <password>

const [,, baseUrl, db, username, password] = process.argv;
if (!baseUrl || !db || !username || !password) {
  console.error('Usage: node scripts/test_odoo_login.js <baseUrl> <db> <username> <password>');
  process.exit(2);
}

(async () => {
  try {
    const url = baseUrl.replace(/\/$/, '') + '/web/session/authenticate';
    const payload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        db,
        login: username,
        password,
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }

    console.log('HTTP', res.status, res.statusText);
    console.log(JSON.stringify(data, null, 2));

    if (data && data.result && data.result.uid) {
      console.log('Login successful, uid:', data.result.uid);
      process.exit(0);
    } else {
      console.error('Login failed');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(3);
  }
})();
