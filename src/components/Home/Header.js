import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const { width } = Dimensions.get('window');

const STATIC_LOGO = require('@assets/images/Home/Header/header_transparent_bg.png');

const Header = () => {
  const [logoUri, setLogoUri] = useState(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    async function loadLogo() {
      try {
        const pairs = await AsyncStorage.multiGet(['device_server_url', 'odoo_session_id', 'userData', 'pos_config_id']);
        const serverUrl = pairs[0][1];
        let session = pairs[1][1];
        const posConfigId = pairs[3][1];

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

        // Step 2: fetch binary via /web/image — most reliable way to get Odoo binary fields
        const tryImageUrl = async (url) => {
          const res = await axios.get(url, {
            headers: { 'Cookie': `session_id=${session}`, 'X-Openerp-Session-Id': session },
            responseType: 'arraybuffer',
            timeout: 10000,
          });
          if (res.status === 200 && res.data?.byteLength > 100) {
            const bytes = new Uint8Array(res.data);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            const b64 = btoa(binary);
            const mime = res.headers['content-type'] || 'image/png';
            return `data:${mime};base64,${b64}`;
          }
          return null;
        };

        // Try pos.config logo first, then company logo
        let logoData = null;
        try {
          logoData = await tryImageUrl(`${base}/web/image/pos.config/${configId}/logo`);
        } catch (_) {}

        if (!logoData) {
          try {
            logoData = await tryImageUrl(`${base}/web/binary/company_logo`);
          } catch (_) {}
        }

        if (!logoData) {
          // Last resort: search_read for company logo
          try {
            const compRes = await axios.post(
              `${base}/web/dataset/call_kw`,
              {
                jsonrpc: '2.0', method: 'call',
                params: {
                  model: 'res.company', method: 'search_read',
                  args: [[]], kwargs: { fields: ['logo'], limit: 1, context: {} },
                },
              },
              { headers, timeout: 10000 }
            );
            const logo = compRes.data?.result?.[0]?.logo;
            if (typeof logo === 'string' && logo.length > 20) {
              logoData = logo.startsWith('data:') ? logo : `data:image/png;base64,${logo}`;
            }
          } catch (_) {}
        }

        if (logoData) setLogoUri(logoData);
      } catch (_) {}
    }
    loadLogo();
  }, []);

  const showDynamic = logoUri && !useFallback;

  return (
    <View style={styles.container}>
      {showDynamic ? (
        <Image
          source={{ uri: logoUri }}
          style={styles.backgroundImage}
          resizeMode="contain"
          onError={() => setUseFallback(true)}
        />
      ) : (
        <Image
          source={STATIC_LOGO}
          style={styles.backgroundImage}
          resizeMode="contain"
        />
      )}
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
