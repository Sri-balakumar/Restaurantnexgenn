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
        const pairs = await AsyncStorage.multiGet(['device_server_url', 'odoo_session_id', 'userData']);
        const serverUrl = pairs[0][1];
        let session = pairs[1][1];

        // Fallback: read session_id from stored userData (covers auto-login path)
        if (!session && pairs[2][1]) {
          try {
            const ud = JSON.parse(pairs[2][1]);
            session = ud?.session_id || null;
          } catch (_) {}
        }

        console.log('[Header] serverUrl:', serverUrl);
        console.log('[Header] session:', session ? session.substring(0, 20) + '...' : null);

        if (!serverUrl || !session) {
          console.log('[Header] Missing serverUrl or session, using fallback');
          return;
        }

        const base = serverUrl.replace(/\/+$/, '');
        const headers = {
          'Content-Type': 'application/json',
          'Cookie': `session_id=${session}`,
          'X-Openerp-Session-Id': session,
        };

        // Step 1: get pos.config id and company logo
        const cfgRes = await axios.post(
          `${base}/web/dataset/call_kw`,
          {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              model: 'pos.config',
              method: 'search_read',
              args: [[]],
              kwargs: { fields: ['id', 'logo'], limit: 1, context: {} },
            },
          },
          { headers, timeout: 10000 }
        );

        console.log('[Header] pos.config result error:', cfgRes.data?.error);
        const cfg = cfgRes.data?.result?.[0];
        console.log('[Header] pos.config id:', cfg?.id, '| logo length:', typeof cfg?.logo === 'string' ? cfg.logo.length : cfg?.logo);

        if (!cfg) {
          console.log('[Header] No pos.config found');
          return;
        }

        const configId = cfg.id;

        // Step 2: fetch pos_logo via ir.attachment
        let b64 = null;
        try {
          const attRes = await axios.post(
            `${base}/web/dataset/call_kw`,
            {
              jsonrpc: '2.0',
              method: 'call',
              params: {
                model: 'ir.attachment',
                method: 'search_read',
                args: [[
                  ['res_model', '=', 'pos.config'],
                  ['res_field', '=', 'pos_logo'],
                  ['res_id', '=', configId],
                ]],
                kwargs: { fields: ['datas', 'mimetype', 'name'], limit: 1, context: {} },
              },
            },
            { headers, timeout: 10000 }
          );
          console.log('[Header] ir.attachment error:', attRes.data?.error);
          const att = attRes.data?.result?.[0];
          console.log('[Header] ir.attachment name:', att?.name, '| datas length:', typeof att?.datas === 'string' ? att.datas.length : att?.datas);

          if (att && typeof att.datas === 'string' && att.datas.length > 20) {
            const mime = att.mimetype || 'image/png';
            b64 = `data:${mime};base64,${att.datas}`;
            console.log('[Header] Using pos_logo from ir.attachment');
          }
        } catch (attErr) {
          console.log('[Header] ir.attachment fetch error:', attErr.message);
        }

        // Step 3: fallback to company logo
        if (!b64) {
          const companyLogo = cfg.logo;
          if (typeof companyLogo === 'string' && companyLogo.length > 20) {
            b64 = companyLogo.startsWith('data:')
              ? companyLogo
              : `data:image/png;base64,${companyLogo}`;
            console.log('[Header] Using company logo, length:', companyLogo.length);
          } else {
            console.log('[Header] Company logo not available:', companyLogo);
          }
        }

        if (b64) {
          setLogoUri(b64);
          console.log('[Header] Logo set successfully');
        } else {
          console.log('[Header] No logo found, will use static fallback');
        }
      } catch (err) {
        console.log('[Header] loadLogo error:', err.message);
      }
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
          onError={(e) => {
            console.log('[Header] Image onError:', e.nativeEvent?.error);
            setUseFallback(true);
          }}
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
