// src/screens/Auth/LoginScreenOdoo.js
import React, { useState } from "react";
import {
  View,
  Keyboard,
  StyleSheet,
  Image,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Alert,
  TextInput as RNTextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { COLORS, FONT_FAMILY } from "@constants/theme";
import { LogBox } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OverlayLoader } from "@components/Loader";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import Text from "@components/Text";
import { SafeAreaView } from "@components/containers";
import { useAuthStore } from "@stores/auth";
import { showToastMessage } from "@components/Toast";
import API_BASE_URL from "@api/config";
import ODOO_DEFAULTS, { DEFAULT_ODOO_BASE_URL, DEFAULT_ODOO_DB } from "@api/config/odooConfig";
import { clearProductCache } from "@api/services/generalApi";

LogBox.ignoreAllLogs();

const NAVY = '#2E294E';
const ORANGE = '#F47B20';

const LoginScreenOdoo = () => {
  const navigation = useNavigation();
  const setUser = useAuthStore((state) => state.login);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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

  const validate = () => {
    Keyboard.dismiss();
    let valid = true;
    const errs = {};
    if (!username.trim()) { errs.username = 'Username is required'; valid = false; }
    if (!password) { errs.password = 'Password is required'; valid = false; }
    setErrors(errs);
    if (valid) login();
  };

  const login = async () => {
    setLoading(true);
    try {
      const deviceUrl = await AsyncStorage.getItem('device_server_url');
      const deviceDb  = await AsyncStorage.getItem('device_db_name');
      const rawUrl = deviceUrl || DEFAULT_ODOO_BASE_URL;
      const baseUrl = rawUrl.trim().replace(/\/+$/, '');
      const finalOdooUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
      const dbNameUsed = deviceDb || DEFAULT_ODOO_DB;

      const response = await axios.post(
        `${finalOdooUrl}/web/session/authenticate`,
        {
          jsonrpc: "2.0",
          method: "call",
          params: { db: dbNameUsed, login: username, password },
        },
        { headers: { "Content-Type": "application/json" }, withCredentials: true }
      );

      if (response.data.result && response.data.result.uid) {
        const userData = response.data.result;
        try { await AsyncStorage.setItem('odoo_db', dbNameUsed); } catch (_) {}
        await AsyncStorage.setItem("userData", JSON.stringify(userData));

        let sessionId = userData.session_id;
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
        if (sessionId) await AsyncStorage.setItem('odoo_session_id', sessionId);

        try { clearProductCache(); } catch (_) {}
        await AsyncStorage.removeItem('pos_config_id');
        try {
          const cfgRes = await axios.post(
            `${finalOdooUrl}/web/dataset/call_kw`,
            {
              jsonrpc: '2.0', method: 'call',
              params: {
                model: 'pos.config', method: 'search_read',
                args: [[]], kwargs: { fields: ['id'], limit: 1, context: {} },
              },
            },
            { headers: { 'Content-Type': 'application/json', 'X-Openerp-Session-Id': sessionId || '' }, timeout: 8000 }
          );
          const configs = cfgRes.data?.result;
          if (Array.isArray(configs) && configs.length > 0) {
            await AsyncStorage.setItem('pos_config_id', String(configs[0].id));
          }
        } catch (_) {}

        setUser(userData);
        navigation.navigate("AppNavigator");
      } else {
        showToastMessage("Invalid credentials. Check your username and password.");
      }
    } catch (error) {
      showToastMessage(`Error! ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView backgroundColor={NAVY} style={{ flex: 1 }}>
        <OverlayLoader visible={loading} />

        {/* ── Header with logo ── */}
        <View style={styles.header}>
          <Image
            source={require('@assets/images/logo2.png')}
            style={styles.logo}
          />
        </View>

        {/* ── White card ── */}
        <View style={styles.card}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cardContent}
          >
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            {/* Username */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Username or Email</Text>
              <View style={[styles.inputBox, errors.username && styles.inputError]}>
                <Text style={styles.inputIcon}>👤</Text>
                <RNTextInput
                  style={styles.input}
                  value={username}
                  onChangeText={(t) => { setUsername(t); setErrors((e) => ({ ...e, username: null })); }}
                  placeholder="Enter username or email"
                  placeholderTextColor="#bbb"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>
              {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputBox, errors.password && styles.inputError]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <RNTextInput
                  style={styles.input}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: null })); }}
                  placeholder="Enter password"
                  placeholderTextColor="#bbb"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {/* Login button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.7 }]}
              onPress={validate}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Login</Text>
              }
            </TouchableOpacity>

            {/* Change server */}
            <TouchableOpacity onPress={handleChangeServer} style={styles.changeBtn}>
              <Text style={styles.changeText}>⚙  Change Server / Reconfigure Device</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
    paddingBottom: 40,
    height: 300,
  },
  logo: {
    width: 320,
    height: 120,
    resizeMode: 'contain',
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontFamily: FONT_FAMILY.urbanistBold,
    color: '#1a1830',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 28,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.urbanistBold,
    color: '#444',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0ddf0',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  inputError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fff8f8',
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#222',
    fontFamily: FONT_FAMILY.urbanistBold,
    paddingVertical: 13,
  },
  eyeBtn: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 16,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  loginBtn: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
    elevation: 3,
    shadowColor: ORANGE,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONT_FAMILY.urbanistBold,
    letterSpacing: 0.5,
  },
  changeBtn: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 6,
  },
  changeText: {
    fontSize: 13,
    color: NAVY,
    fontFamily: FONT_FAMILY.urbanistBold,
    textDecorationLine: 'underline',
    opacity: 0.7,
  },
});

export default LoginScreenOdoo;
