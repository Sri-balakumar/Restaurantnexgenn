// src/screens/Auth/LoginScreenOdoo.js
import React, { useState } from "react";
import {
  View,
  Keyboard,
  StyleSheet,
  Image,
  TouchableWithoutFeedback,
  Switch,
  TouchableOpacity,
  Alert,
} from "react-native";
import { COLORS, FONT_FAMILY } from "@constants/theme";
import { LogBox } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button } from "@components/common/Button";
import { OverlayLoader } from "@components/Loader";
import axios from "axios";
// Removed expo-cookie import
import { post } from "@api/services/utils";
import { useNavigation } from "@react-navigation/native";
import Text from "@components/Text";
import { TextInput } from "@components/common/TextInput";
import { RoundedScrollContainer, SafeAreaView } from "@components/containers";
import { useAuthStore } from "@stores/auth";
import { showToastMessage } from "@components/Toast";
// ...existing code...

import API_BASE_URL from "@api/config";
import ODOO_DEFAULTS, { DEFAULT_ODOO_BASE_URL, DEFAULT_ODOO_DB, DEV_ODOO_USERNAME, DEV_ODOO_PASSWORD } from "@api/config/odooConfig";

LogBox.ignoreLogs(["new NativeEventEmitter"]);
LogBox.ignoreAllLogs();

// 🔍 Check if URL looks like an Odoo server (accepts ngrok, http(s) hosts, or typical Odoo paths)
const isOdooUrl = (url = "") => {
  const lower = url.toLowerCase();
  // Accept explicit protocols, ngrok hosts, or typical odoo paths
  return (
    lower.startsWith('http') ||
    lower.includes('ngrok') ||
    lower.includes('odoo') ||
    lower.includes('/web') ||
    lower.includes(':8069')
  );
};

const LoginScreenOdoo = () => {
  const navigation = useNavigation();
  const setUser = useAuthStore((state) => state.login);
  // ...existing code...

  const { container, imageContainer } = styles;

  LogBox.ignoreLogs([
    "Non-serializable values were found in the navigation state",
  ]);

  const [inputs, setInputs] = useState({
    baseUrl: "", // ✅ NEW: Server URL (optional)
    username: "",
    password: "",
  });

  // Pre-fill server URL and DB from device registration config
  React.useEffect(() => {
    async function prefillFromDevice() {
      try {
        const savedUrl = await AsyncStorage.getItem('device_server_url');
        if (savedUrl) {
          setInputs((prev) => ({ ...prev, baseUrl: savedUrl }));
        }
      } catch (_) {}
    }
    prefillFromDevice();
  }, []);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [useDevAutofill, setUseDevAutofill] = useState(false);

  // Use configured Odoo base URL for dev autofill; credentials imported from config
  const DEV_ODOO_BASE_URL = DEFAULT_ODOO_BASE_URL || 'http://192.168.29.43:8069/';

  const handleOnchange = (text, input) => {
    setInputs((prevState) => ({ ...prevState, [input]: text }));
  };

  const handleError = (error, input) => {
    setErrors((prevState) => ({ ...prevState, [input]: error }));
  };

  const validate = () => {
    Keyboard.dismiss();
    let isValid = true;

    if (!inputs.username) {
      handleError("Please input user name", "username");
      isValid = false;
    }
    if (!inputs.password) {
      handleError("Please input password", "password");
      isValid = false;
    }
    // ...existing code...

    if (isValid) {
      login();
    }
  };

  const handleChangeServer = () => {
    Alert.alert(
      'Change Server',
      'This will clear the current device configuration and take you back to the setup screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reconfigure',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              'device_uuid',
              'device_server_url',
              'device_db_name',
              'device_registered',
              'odoo_session_id',
              'userData',
            ]);
            navigation.reset({ index: 0, routes: [{ name: 'DeviceSetup' }] });
          },
        },
      ]
    );
  };

  const login = async () => {
    setLoading(true);
    try {
      const username = inputs.username;
      const password = inputs.password;

      // Always prefer the URL saved during device setup
      const deviceUrl = await AsyncStorage.getItem('device_server_url');
      const deviceDb  = await AsyncStorage.getItem('device_db_name');

      const rawUrl = deviceUrl || inputs.baseUrl || DEFAULT_ODOO_BASE_URL;
      const baseUrl = rawUrl.trim().replace(/\/+$/, '');
      const finalOdooUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
      const dbNameUsed = deviceDb || DEFAULT_ODOO_DB;

      const useOdoo = true; // device setup always provides an Odoo URL

      if (useOdoo) {
        // ODOO LOGIN — uses URL + DB from device setup silently
        const response = await axios.post(
          `${finalOdooUrl}/web/session/authenticate`,
          {
            jsonrpc: "2.0",
            method: "call",
            params: {
              db: dbNameUsed,
              login: username,
              password: password,
            },
          },
          {
            headers: { "Content-Type": "application/json" },
            withCredentials: true,
          }
        );
        if (response.data.result && response.data.result.uid) {
          const userData = response.data.result;
          // persist selected/used DB for future calls
          try { await AsyncStorage.setItem('odoo_db', dbNameUsed); } catch (e) {}
          await AsyncStorage.setItem("userData", JSON.stringify(userData));

          // Try multiple sources for session_id
          let sessionId = userData.session_id;

          // Fallback: parse from Set-Cookie header if not in response body
          if (!sessionId) {
            try {
              const cookieHeader = response.headers['set-cookie'];
              if (cookieHeader) {
                const cookieStr = Array.isArray(cookieHeader) ? cookieHeader.join(';') : cookieHeader;
                const match = cookieStr.match(/session_id=([^;,\s]+)/);
                if (match) sessionId = match[1];
              }
            } catch (_) {}
          }

          console.log('[Login] session_id from response:', sessionId ? sessionId.substring(0, 20) + '...' : null);

          if (sessionId) {
            await AsyncStorage.setItem('odoo_session_id', sessionId);
          } else {
            console.warn('[Login] WARNING: No session_id found in response. Logo fetch will fail.');
          }
          // Clear cached pos_config_id so Header re-fetches for new DB/session
          await AsyncStorage.removeItem('pos_config_id');
          // Fetch pos.config ID for building the pos_logo image URL in Header
          try {
            const base = finalOdooUrl.replace(/\/+$/, '');
            const cfgRes = await axios.post(
              `${base}/web/dataset/call_kw`,
              {
                jsonrpc: '2.0',
                method: 'call',
                params: {
                  model: 'pos.config',
                  method: 'search_read',
                  args: [[]],
                  kwargs: { fields: ['id'], limit: 1, context: {} },
                },
              },
              {
                headers: { 'Content-Type': 'application/json', 'X-Openerp-Session-Id': sessionId || '' },
                timeout: 8000,
              }
            );
            const configs = cfgRes.data?.result;
            if (Array.isArray(configs) && configs.length > 0) {
              await AsyncStorage.setItem('pos_config_id', String(configs[0].id));
            }
          } catch (_) {
            // Non-critical — logo will fall back to static asset
          }
          setUser(userData);
          navigation.navigate("AppNavigator");
        } else {
          showToastMessage("Invalid credentials. Check your username and password.");
        }
      }
    } catch (error) {
      showToastMessage(`Error! ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <SafeAreaView style={container}>
        <OverlayLoader visible={loading} />

        <RoundedScrollContainer
          backgroundColor={COLORS.white}
          paddingHorizontal={15}
          borderTopLeftRadius={40}
          borderTopRightRadius={40}
        >
          <View style={{ paddingTop: 50 }}>
            {/* Logo above login */}
            <View style={{ alignItems: 'center', marginBottom: 10 }}>
              <Image
                source={require('@assets/images/logo2.png')}
                style={{ width: 400, height: 400, resizeMode: 'contain' }}
              />
            </View>
            <View style={{ marginVertical: 5, marginHorizontal: 10 }}>
              <View style={{ marginTop: 0, marginBottom: 15 }}>
                {/* Only show Login heading, remove all hint/info texts above */}
                <Text
                  style={{
                    fontSize: 25,
                    fontFamily: FONT_FAMILY.urbanistBold,
                    color: "#2e2a4f",
                    textAlign: "center",
                  }}
                >
                  Login
                </Text>
              </View>

              {/* Username */}
              <TextInput
                onChangeText={(text) => handleOnchange(text, "username")}
                onFocus={() => handleError(null, "username")}
                iconName="account-outline"
                label="Username or Email"
                placeholder="Enter Username or Email"
                error={errors.username}
                value={inputs.username}
                column={true}
                login={true}
              />

              {/* Password */}
              <TextInput
                onChangeText={(text) => handleOnchange(text, "password")}
                onFocus={() => handleError(null, "password")}
                error={errors.password}
                iconName="lock-outline"
                label="Password"
                placeholder="Enter password"
                password
                value={inputs.password}
                column={true}
                login={true}
              />

              {/* ...existing code... */}

              {/* Autofill dev creds (username/password only — URL comes from device setup) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Switch value={useDevAutofill} onValueChange={(v) => {
                  setUseDevAutofill(v);
                  if (v) {
                    setInputs(prev => ({ ...prev, username: DEV_ODOO_USERNAME, password: DEV_ODOO_PASSWORD }));
                  } else {
                    setInputs(prev => ({ ...prev, username: '', password: '' }));
                  }
                }} />
                <Text style={{ marginLeft: 8, color: COLORS.grey }}>Autofill dev credentials</Text>
              </View>

              {/* Login Button */}
              <View style={styles.bottom}>
                <Button title="Login" onPress={validate} />
              </View>

              {/* Change server link */}
              <TouchableOpacity onPress={handleChangeServer} style={styles.changeServerBtn}>
                <Text style={styles.changeServerText}>⚙ Change Server / Reconfigure Device</Text>
              </TouchableOpacity>
            </View>
          </View>
        </RoundedScrollContainer>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  tinyLogo: {
    width: 200,
    height: 200,
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: "20%",
  },
  bottom: {
    alignItems: "center",
    marginTop: 10,
  },
  label: {
    marginVertical: 5,
    fontSize: 14,
    color: COLORS.grey,
    marginLeft: 180,
    marginTop: 15,
  },
  changeServerBtn: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 6,
  },
  changeServerText: {
    fontSize: 13,
    color: '#875a7b',
    fontFamily: FONT_FAMILY.urbanistBold,
    textDecorationLine: 'underline',
  },
});

export default LoginScreenOdoo;
