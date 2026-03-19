// src/screens/Auth/LoginScreenOdoo.js
import React, { useState, useEffect } from "react";
import {
  View,
  Keyboard,
  StyleSheet,
  Image,
  TouchableWithoutFeedback,
  TouchableOpacity,
  TextInput as RNTextInput,
  ActivityIndicator,
  ScrollView,
  Switch,
<<<<<<< HEAD
  I18nManager,
=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
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
import ODOO_DEFAULTS, { DEFAULT_ODOO_BASE_URL, DEFAULT_ODOO_DB, DEV_ODOO_USERNAME, DEV_ODOO_PASSWORD } from "@api/config/odooConfig";
import { clearProductCache } from "@api/services/generalApi";
<<<<<<< HEAD
import { useTranslation } from "@hooks";
import { useLanguageStore } from "@stores/language";
=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f

LogBox.ignoreAllLogs();

const NAVY = '#2E294E';
const ORANGE = '#F47B20';

const LoginScreenOdoo = () => {
  const navigation = useNavigation();
  const setUser = useAuthStore((state) => state.login);
<<<<<<< HEAD
  const { t, language, isRTL } = useTranslation();
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const loadLanguage = useLanguageStore((state) => state.loadLanguage);
=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [rememberMe, setRememberMe] = useState(false);
<<<<<<< HEAD

  // Load saved language preference on mount
  useEffect(() => {
    loadLanguage();
  }, []);
=======
  const [hasSavedCreds, setHasSavedCreds] = useState(false);
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f

  // Restore toggle state and auto-fill credentials on mount
  useEffect(() => {
    async function restoreAutofill() {
      try {
        const toggleState = await AsyncStorage.getItem('autofill_enabled');
        if (toggleState === 'true') {
          setRememberMe(true);
          // Fill credentials from saved sources
          const saved = await AsyncStorage.getItem('saved_credentials');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.username) setUsername(parsed.username);
            if (parsed.password) setPassword(parsed.password);
            return;
          }
          const udRaw = await AsyncStorage.getItem('userData');
          if (udRaw) {
            const ud = JSON.parse(udRaw);
            if (ud?.login || ud?.username) setUsername(ud.login || ud.username);
            if (ud?._pwd) setPassword(ud._pwd);
          }
        }
      } catch (_) {}
    }
    restoreAutofill();
  }, []);

  const validate = () => {
    Keyboard.dismiss();
    let valid = true;
    const errs = {};
<<<<<<< HEAD
    if (!username.trim()) { errs.username = t.usernameRequired; valid = false; }
    if (!password) { errs.password = t.passwordRequired; valid = false; }
    setErrors(errs);
    if (valid) doLogin();
  };

  const doLogin = async () => {
=======
    if (!username.trim()) { errs.username = 'Username is required'; valid = false; }
    if (!password) { errs.password = 'Password is required'; valid = false; }
    setErrors(errs);
    if (valid) login();
  };

  const login = async () => {
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
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
        userData._pwd = password;
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

        // Always save credentials so Autofill can use them next time
        await AsyncStorage.setItem('saved_credentials', JSON.stringify({ username, password }));
        // Persist toggle preference
        await AsyncStorage.setItem('autofill_enabled', JSON.stringify(rememberMe));

        setUser(userData);
        navigation.navigate("AppNavigator");
      } else {
<<<<<<< HEAD
        showToastMessage(t.invalidCredentials);
=======
        showToastMessage("Invalid credentials. Check your username and password.");
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
      }
    } catch (error) {
      showToastMessage(`Error! ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  const rtlStyle = isRTL ? { textAlign: 'right', writingDirection: 'rtl' } : {};
  const rtlRowStyle = isRTL ? { flexDirection: 'row-reverse' } : {};

=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView backgroundColor={NAVY} style={{ flex: 1 }}>
        <OverlayLoader visible={loading} />

        {/* ── Header with logo ── */}
        <View style={styles.header}>
          <View style={styles.logoGlow} />
          <Image
            source={require('@assets/images/logo2.png')}
            style={styles.logo}
            resizeMode="contain"
          />
<<<<<<< HEAD
          <TouchableOpacity
            style={styles.gearBtn}
            onPress={() => navigation.navigate('DeviceSetup')}
            activeOpacity={0.7}
          >
            <Text style={styles.gearIcon}>⚙️</Text>
          </TouchableOpacity>

          {/* Language Toggle */}
          <View style={styles.langToggleWrap}>
            <TouchableOpacity
              style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
              onPress={() => setLanguage('en')}
              activeOpacity={0.7}
            >
              <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, language === 'ar' && styles.langBtnActive]}
              onPress={() => setLanguage('ar')}
              activeOpacity={0.7}
            >
              <Text style={[styles.langBtnText, language === 'ar' && styles.langBtnTextActive]}>عربي</Text>
            </TouchableOpacity>
          </View>
=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
        </View>

        {/* ── White card ── */}
        <View style={styles.card}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cardContent}
          >
<<<<<<< HEAD
            <Text style={[styles.title, rtlStyle]}>{t.welcomeBack}</Text>
            <Text style={[styles.subtitle, rtlStyle]}>{t.signInToContinue}</Text>

            {/* Username */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, rtlStyle]}>{t.usernameOrEmail}</Text>
              <View style={[styles.inputBox, errors.username && styles.inputError, rtlRowStyle]}>
                <Text style={styles.inputIcon}>👤</Text>
                <RNTextInput
                  style={[styles.input, rtlStyle]}
                  value={username}
                  onChangeText={(v) => { setUsername(v); setErrors((e) => ({ ...e, username: null })); }}
                  placeholder={t.enterUsername}
=======
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
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
                  placeholderTextColor="#bbb"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>
<<<<<<< HEAD
              {errors.username ? <Text style={[styles.errorText, rtlStyle]}>{errors.username}</Text> : null}
=======
              {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
<<<<<<< HEAD
              <Text style={[styles.label, rtlStyle]}>{t.password}</Text>
              <View style={[styles.inputBox, errors.password && styles.inputError, rtlRowStyle]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <RNTextInput
                  style={[styles.input, rtlStyle]}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: null })); }}
                  placeholder={t.enterPassword}
=======
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputBox, errors.password && styles.inputError]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <RNTextInput
                  style={styles.input}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: null })); }}
                  placeholder="Enter password"
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
                  placeholderTextColor="#bbb"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
<<<<<<< HEAD
              {errors.password ? <Text style={[styles.errorText, rtlStyle]}>{errors.password}</Text> : null}
            </View>

            {/* Autofill Credentials toggle */}
            <View style={[styles.rememberRow, rtlRowStyle]}>
              <Text style={[styles.rememberText, rtlStyle]}>{t.autofillCredentials}</Text>
=======
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {/* Autofill Credentials toggle */}
            <View style={styles.rememberRow}>
              <Text style={styles.rememberText}>Autofill Credentials</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
              <Switch
                value={rememberMe}
                onValueChange={async (val) => {
                  setRememberMe(val);
                  if (val) {
                    try {
                      // 1. Get server URL and DB
                      const deviceUrl = await AsyncStorage.getItem('device_server_url');
                      const deviceDb = await AsyncStorage.getItem('device_db_name');
                      let session = await AsyncStorage.getItem('odoo_session_id');
                      const rawUrl = deviceUrl || DEFAULT_ODOO_BASE_URL;
                      const baseUrl = rawUrl.trim().replace(/\/+$/, '');
                      const finalUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
                      const dbName = deviceDb || DEFAULT_ODOO_DB;

                      // 2. Collect credentials from all available sources
                      let foundUser = null;
                      let foundPass = null;

                      // Source A: saved_credentials (from a previous login with toggle ON)
                      const saved = await AsyncStorage.getItem('saved_credentials');
                      if (saved) {
                        const parsed = JSON.parse(saved);
                        if (parsed.username) foundUser = parsed.username;
                        if (parsed.password) foundPass = parsed.password;
                      }

                      // Source B: userData from last login (always saved on login)
                      if (!foundUser || !foundPass) {
                        const udRaw = await AsyncStorage.getItem('userData');
                        if (udRaw) {
                          const ud = JSON.parse(udRaw);
                          if (!foundUser && (ud?.login || ud?.username)) foundUser = ud.login || ud.username;
                          if (!foundPass && ud?._pwd) foundPass = ud._pwd;
                        }
                      }

                      // 3. If no session, try to get one by re-authenticating
                      if (!session) {
                        const authUser = foundUser || DEV_ODOO_USERNAME;
                        const authPass = foundPass || DEV_ODOO_PASSWORD;

                        try {
                          const authRes = await axios.post(
                            `${finalUrl}/web/session/authenticate`,
                            {
                              jsonrpc: '2.0', method: 'call',
                              params: { db: dbName, login: authUser, password: authPass },
                            },
                            { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
                          );
                          const authData = authRes.data?.result;
                          if (authData?.uid) {
                            session = authData.session_id;
                            if (!session) {
                              const cookieHeader = authRes.headers['set-cookie'];
                              if (cookieHeader) {
                                const cookieStr = Array.isArray(cookieHeader) ? cookieHeader.join(';') : cookieHeader;
                                const match = cookieStr.match(/session_id=([^;,\s]+)/);
                                if (match) session = match[1];
                              }
                            }
                            if (session) await AsyncStorage.setItem('odoo_session_id', session);
                          }
                        } catch (_) {}
                      }

                      // 4. Fetch username from Odoo DB (more accurate than saved data)
                      let filledUser = false;
                      let filledPass = false;

                      if (session && finalUrl) {
                        const headers = {
                          'Content-Type': 'application/json',
                          'Cookie': `session_id=${session}`,
                          'X-Openerp-Session-Id': session,
                          ...(dbName ? { 'X-Odoo-Database': dbName } : {}),
                        };

                        try {
                          const res = await axios.post(
                            `${finalUrl}/web/dataset/call_kw`,
                            {
                              jsonrpc: '2.0', method: 'call',
                              params: {
                                model: 'res.users', method: 'search_read',
                                args: [[]], kwargs: {
                                  fields: ['login', 'name'],
                                  limit: 1,
                                  order: 'write_date desc',
                                  context: {},
                                },
                              },
                            },
                            { headers, timeout: 8000 }
                          );
                          const user = res.data?.result?.[0];
                          if (user?.login) {
                            setUsername(user.login);
                            filledUser = true;
                          }
                        } catch (_) {}
                      }

                      // 5. Fill username from saved sources if API didn't provide it
                      if (!filledUser && foundUser) {
                        setUsername(foundUser);
                        filledUser = true;
                      }

                      // 6. Fill password from saved sources
                      if (foundPass) {
                        setPassword(foundPass);
                        filledPass = true;
                      }

                      if (filledUser || filledPass) {
<<<<<<< HEAD
                        showToastMessage(t.credentialsFilled);
                      } else {
                        showToastMessage(t.noSavedCredentials);
                      }
                    } catch (_) {
                      showToastMessage(t.couldNotFetch);
=======
                        showToastMessage('Credentials filled successfully');
                      } else {
                        showToastMessage('No saved credentials found. Please login once first.');
                      }
                    } catch (_) {
                      showToastMessage('Could not fetch credentials. Please login manually.');
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
                    }
                  } else {
                    // Clear fields when toggled OFF
                    setUsername('');
                    setPassword('');
                    await AsyncStorage.setItem('autofill_enabled', 'false');
                  }
                }}
                trackColor={{ false: '#ddd', true: ORANGE + '80' }}
                thumbColor={rememberMe ? ORANGE : '#f4f3f4'}
              />
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
<<<<<<< HEAD
                : <Text style={styles.loginBtnText}>{t.login}</Text>
=======
                : <Text style={styles.loginBtnText}>Login</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
              }
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
  logoGlow: {
    position: 'absolute',
    width: 340,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  logo: {
    width: 260,
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
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
    paddingVertical: 4,
  },
  rememberText: {
    fontSize: 14,
    color: '#444',
    fontFamily: FONT_FAMILY.urbanistBold,
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
<<<<<<< HEAD
  gearBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearIcon: {
    fontSize: 20,
  },
  // Language toggle styles
  langToggleWrap: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 3,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 17,
  },
  langBtnActive: {
    backgroundColor: ORANGE,
  },
  langBtnText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.urbanistBold,
    color: 'rgba(255,255,255,0.7)',
  },
  langBtnTextActive: {
    color: '#fff',
  },
=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
});

export default LoginScreenOdoo;
