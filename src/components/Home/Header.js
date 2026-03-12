import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const { width } = Dimensions.get('window');

const Header = () => {
  const [logoUri, setLogoUri] = useState(null);

  useEffect(() => {
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

        if (!serverUrl || !session) return;

        const base = serverUrl.replace(/\/+$/, '');
        const headers = {
          'Content-Type': 'application/json',
          'Cookie': `session_id=${session}`,
          'X-Openerp-Session-Id': session,
        };
        if (dbName) headers['X-Odoo-Database'] = dbName;

        // Step 1: get pos.config id
        let configId = posConfigId ? parseInt(posConfigId) : null;
        if (!configId) {
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
        }

        if (!configId) return;

        // Step 2: fetch pos_logo from pos.config
        let logoData = null;
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
            logoData = logoB64.startsWith('data:') ? logoB64 : `data:image/png;base64,${logoB64}`;
          }
        } catch (e) {
          console.warn('[Header] pos_logo fetch failed:', e.message);
        }

        // Fallback: company logo via /web/binary/company_logo URL
        // React Native Image supports headers, so load it directly as a URL
        if (!logoData) {
          setLogoUri({
            url: `${base}/web/binary/company_logo`,
            session,
          });
          return;
        }

        if (logoData) setLogoUri(logoData);
      } catch (_) {}
    }
    loadLogo();
  }, []);

  if (!logoUri) return null;

  // logoUri is either a base64 data URI string or an object { url, session } for URL-based loading
  const imageSource = typeof logoUri === 'string'
    ? { uri: logoUri }
    : {
        uri: logoUri.url,
        headers: {
          'Cookie': `session_id=${logoUri.session}`,
          'X-Openerp-Session-Id': logoUri.session,
        },
      };

  return (
    <View style={styles.container}>
      <Image
        source={imageSource}
        style={styles.backgroundImage}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  backgroundImage: {
    width: width * 0.42,
    aspectRatio: 3,
    resizeMode: 'contain',
  },
});

export default Header;
