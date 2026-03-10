// src/api/odooConfig.js

// 🔹 Put your Odoo server URL here ONE time
// Local Odoo development server (updated to your machine)
const ODOO_BASE_URL = "http://192.168.29.43:8079/";




// Default DB to use for Odoo JSON-RPC login (change to your test DB)
const DEFAULT_ODOO_DB = "nexgenn-restaurant";


// Optional dev credentials (for local autofill - DO NOT COMMIT real credentials to repos)
const DEV_ODOO_USERNAME = 'admin';
const DEV_ODOO_PASSWORD = 'admin';


// Named export for default base URL for backward compatibility
const DEFAULT_ODOO_BASE_URL = ODOO_BASE_URL;

export { DEFAULT_ODOO_DB, DEFAULT_ODOO_BASE_URL, DEV_ODOO_USERNAME, DEV_ODOO_PASSWORD };
export default ODOO_BASE_URL;
