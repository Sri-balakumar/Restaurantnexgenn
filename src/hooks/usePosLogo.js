import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

/**
 * Shared hook to fetch the POS logo (pos_logo from pos.config).
 * Falls back to company logo via /web/binary/company_logo URL.
 * Works even without a session (login screen) — company logo URL is public.
 *
 * Returns: React Native Image source object or null
 */
export default function usePosLogo() {
  const [logoSource, setLogoSource] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLogo() {
      try {
        const pairs = await AsyncStorage.multiGet([
          'device_server_url', 'odoo_session_id', 'userData', 'pos_config_id', 'device_db_name',
        ]);
        const serverUrl = pairs[0][1];
        let session = pairs[1][1];
        const posConfigId = pairs[3][1];
        const dbName = pairs[4][1];

        if (!session && pairs[2][1]) {
          try {
            const ud = JSON.parse(pairs[2][1]);
            session = ud?.session_id || null;
          } catch (_) {}
        }

        if (!serverUrl) return;

        const base = serverUrl.replace(/\/+$/, '');

        // If we have a session, try to fetch pos_logo from pos.config
        if (session) {
          const headers = {
            'Content-Type': 'application/json',
            'Cookie': `session_id=${session}`,
            'X-Openerp-Session-Id': session,
          };
          if (dbName) headers['X-Odoo-Database'] = dbName;

          // Step 1: get pos.config id
          let configId = posConfigId ? parseInt(posConfigId) : null;
          if (!configId) {
            try {
              const cfgRes = await axios.post(
                `${base}/web/dataset/call_kw`,
                {
                  jsonrpc: '2.0', method: 'call',
                  params: {
                    model: 'pos.config', method: 'search_read',
                    args: [[]], kwargs: { fields: ['id'], limit: 1, context: {} },
                  },
                },
                { headers, timeout: 10000 }
              );
              configId = cfgRes.data?.result?.[0]?.id;
            } catch (_) {}
          }

          // Step 2: fetch pos_logo
          if (configId && !cancelled) {
            try {
              const cfgLogoRes = await axios.post(
                `${base}/web/dataset/call_kw`,
                {
                  jsonrpc: '2.0', method: 'call',
                  params: {
                    model: 'pos.config', method: 'search_read',
                    args: [[['id', '=', configId]]],
                    kwargs: { fields: ['pos_logo'], limit: 1, context: {} },
                  },
                },
                { headers, timeout: 10000 }
              );
              const logoB64 = cfgLogoRes.data?.result?.[0]?.pos_logo;
              if (typeof logoB64 === 'string' && logoB64.length > 20) {
                const uri = logoB64.startsWith('data:') ? logoB64 : `data:image/png;base64,${logoB64}`;
                if (!cancelled) setLogoSource({ uri });
                return;
              }
            } catch (e) {
              console.warn('[usePosLogo] pos_logo fetch failed:', e.message);
            }
          }
        }

        // Fallback: company logo URL (works without auth in Odoo)
        if (!cancelled) {
          const source = { uri: `${base}/web/binary/company_logo` };
          if (session) {
            source.headers = {
              'Cookie': `session_id=${session}`,
              'X-Openerp-Session-Id': session,
            };
          }
          if (dbName) {
            source.uri = `${base}/web/binary/company_logo?db=${dbName}`;
          }
          setLogoSource(source);
        }
      } catch (e) {
        console.warn('[usePosLogo] loadLogo error:', e.message);
      }
    }

    loadLogo();
    return () => { cancelled = true; };
  }, []);

  return logoSource;
}
