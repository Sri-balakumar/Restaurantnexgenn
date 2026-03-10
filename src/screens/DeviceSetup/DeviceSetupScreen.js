// src/screens/DeviceSetup/DeviceSetupScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Text from '@components/Text';
import { OverlayLoader } from '@components/Loader';
import { SafeAreaView } from '@components/containers';
import { showToastMessage } from '@components/Toast';
import { FONT_FAMILY } from '@constants/theme';
import * as deviceApi from '@api/services/deviceApi';
import { generateUUIDv4 } from '@utils/uuid';

// Auto-detect device name from expo-constants, fall back to OS info
function getDeviceName() {
  try {
    const name = Constants.deviceName;
    if (name && name.trim()) return name.trim();
  } catch (_) {}
  return `${Platform.OS === 'ios' ? 'iOS' : 'Android'} Device`;
}

const PURPLE = '#875a7b';
const LIGHT_PURPLE = '#f5eef8';
const BORDER = '#e0d0e8';

// ─── Small reusable components ───────────────────────────────────────────────

const Label = ({ text, required }) => (
  <Text style={styles.label}>
    {text}
    {required && <Text style={styles.labelRequired}> *</Text>}
  </Text>
);

const Field = ({ label, required, error, children }) => (
  <View style={styles.fieldGroup}>
    {label ? <Label text={label} required={required} /> : null}
    {children}
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const StyledInput = ({ value, onChangeText, placeholder, onFocus, keyboardType, autoCapitalize, hasError }) => (
  <View style={[styles.input, hasError && styles.inputError]}>
    <Text
      style={styles.inputText}
      numberOfLines={1}
    >
      {/* We render via TextInput natively below */}
    </Text>
    {/* Use RN TextInput directly for full control */}
    <TextInputNative
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#bbb"
      onFocus={onFocus}
      keyboardType={keyboardType || 'default'}
      autoCapitalize={autoCapitalize || 'none'}
      autoCorrect={false}
      style={styles.nativeInput}
    />
  </View>
);

// ─── Main screen ─────────────────────────────────────────────────────────────

import { TextInput as TextInputNative } from 'react-native';

const DeviceSetupScreen = () => {
  const navigation = useNavigation();

  const [serverUrl, setServerUrl] = useState('');
  const [databases, setDatabases] = useState([]);
  const [selectedDb, setSelectedDb] = useState('');
  const [manualDb, setManualDb] = useState('');        // fallback: typed DB name
  const [useManualDb, setUseManualDb] = useState(false); // toggle manual input
  const deviceName = getDeviceName();                  // auto-detected, not editable
  const [loadingDbs, setLoadingDbs] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [dbDropdownOpen, setDbDropdownOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // Pre-fill from previously stored config
  useEffect(() => {
    async function prefill() {
      try {
        const pairs = await AsyncStorage.multiGet(['device_server_url', 'device_db_name']);
        const savedUrl = pairs[0][1];
        const savedDb = pairs[1][1];
        if (savedUrl) setServerUrl(savedUrl);
        if (savedDb) {
          setManualDb(savedDb);
          setUseManualDb(true);
        }
      } catch (_) {}
    }
    prefill();
  }, []);

  const setError = (field, msg) => setErrors((p) => ({ ...p, [field]: msg }));
  const clearError = (field) => setErrors((p) => ({ ...p, [field]: null }));

  const normalizeUrl = (url = '') => {
    let u = url.trim();
    if (u && !u.startsWith('http')) u = 'http://' + u;
    return u.replace(/\/+$/, '');
  };

  // Active DB value — either from dropdown or manual input
  const activeDb = useManualDb ? manualDb.trim() : selectedDb;

  // ── Fetch databases ─────────────────────────────────────────────────────
  const handleFetchDatabases = async () => {
    Keyboard.dismiss();
    if (!serverUrl.trim()) {
      setError('serverUrl', 'Enter the Odoo server URL first');
      return;
    }
    clearError('serverUrl');
    setLoadingDbs(true);
    setDatabases([]);
    setSelectedDb('');
    setFetchAttempted(true);

    try {
      const dbs = await deviceApi.fetchDatabases(normalizeUrl(serverUrl));
      if (!dbs || dbs.length === 0) {
        showToastMessage('No databases found — enter the database name manually');
        setUseManualDb(true);
      } else {
        setDatabases(dbs);
        setUseManualDb(false);
        setDbDropdownOpen(true);
      }
    } catch (err) {
      // 404 = module endpoint not accessible; fall back to manual entry
      const is404 = err?.response?.status === 404;
      if (is404) {
        showToastMessage('Auto-fetch unavailable — enter database name manually');
      } else {
        showToastMessage(`Server error: ${err.message}`);
      }
      setUseManualDb(true);
    } finally {
      setLoadingDbs(false);
    }
  };

  // ── Skip registration (module not installed) ────────────────────────────
  const skipToLogin = async () => {
    try {
      await AsyncStorage.multiSet([
        ['device_server_url', normalizeUrl(serverUrl)],
        ['device_db_name', activeDb],
        ['device_registered', 'skipped'],
      ]);
    } catch (_) {}
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const show404Alert = () => {
    Alert.alert(
      '⚠️  Module Not Installed',
      'The "Device Login Config" module (device_login_config) is not installed on your Odoo server.\n\n' +
      'To fix this:\n' +
      '1. Open Odoo → Apps\n' +
      '2. Search "device_login_config"\n' +
      '3. Install it and try again\n\n' +
      'Or tap "Continue Anyway" to skip device registration and go directly to login.',
      [
        {
          text: 'Continue Anyway',
          onPress: skipToLogin,
        },
        {
          text: 'OK — I will install it',
          style: 'cancel',
        },
      ]
    );
  };

  // ── Register device ─────────────────────────────────────────────────────
  const handleRegister = async () => {
    Keyboard.dismiss();
    let valid = true;

    if (!serverUrl.trim()) {
      setError('serverUrl', 'Server URL is required');
      valid = false;
    }
    if (!activeDb) {
      setError('db', useManualDb ? 'Enter the database name' : 'Select a database');
      valid = false;
    }
    if (!valid) return;

    setLoadingRegister(true);
    try {
      let uuid = await AsyncStorage.getItem('device_uuid');
      if (!uuid) {
        uuid = generateUUIDv4();
        await AsyncStorage.setItem('device_uuid', uuid);
      }

      const result = await deviceApi.initDevice({
        baseUrl: normalizeUrl(serverUrl),
        databaseName: activeDb,
        deviceId: uuid,
        deviceName: deviceName,
      });

      if (result && (result.registered === true || result.just_registered === true)) {
        await AsyncStorage.multiSet([
          ['device_server_url', normalizeUrl(serverUrl)],
          ['device_db_name', activeDb],
          ['device_registered', 'true'],
        ]);
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        const msg = result?.error || 'Registration failed — check your server URL and database name';
        showToastMessage(msg);
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        show404Alert();
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        showToastMessage('Connection timed out. Check your network and server URL.');
      } else if (err.message?.includes('Network Error') || err.message?.includes('ECONNREFUSED')) {
        showToastMessage('Cannot reach server. Check the URL and ensure Odoo is running.');
      } else {
        showToastMessage(`Error: ${err.message}`);
      }
    } finally {
      setLoadingRegister(false);
    }
  };

  const isLoading = loadingDbs || loadingRegister;

  return (
    <TouchableWithoutFeedback
      onPress={() => { Keyboard.dismiss(); setDbDropdownOpen(false); }}
    >
      <SafeAreaView backgroundColor={PURPLE}>
        <OverlayLoader visible={loadingRegister} />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>⚙</Text>
            </View>
            <Text style={styles.headerTitle}>Device Setup</Text>
            <Text style={styles.headerSubtitle}>
              Register this device with your Odoo server to continue
            </Text>
          </View>

          {/* ── Form card ── */}
          <View style={styles.card}>

            {/* Step 1 — Server URL */}
            <View style={styles.stepRow}>
              <View style={styles.stepBadge}><Text style={styles.stepNum}>1</Text></View>
              <Text style={styles.stepTitle}>Odoo Server URL</Text>
            </View>

            <Field error={errors.serverUrl}>
              <TextInputNative
                value={serverUrl}
                onChangeText={(t) => { setServerUrl(t); clearError('serverUrl'); }}
                onFocus={() => clearError('serverUrl')}
                placeholder="http://192.168.1.10:8069"
                placeholderTextColor="#bbb"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={[styles.nativeInput, errors.serverUrl && styles.inputError]}
              />
            </Field>

            <TouchableOpacity
              style={[styles.fetchBtn, loadingDbs && styles.btnDisabled]}
              onPress={handleFetchDatabases}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {loadingDbs ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.fetchBtnText}>Fetch Databases</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Step 2 — Database */}
            <View style={styles.stepRow}>
              <View style={styles.stepBadge}><Text style={styles.stepNum}>2</Text></View>
              <Text style={styles.stepTitle}>Database</Text>
              {fetchAttempted && (
                <TouchableOpacity
                  onPress={() => { setUseManualDb((v) => !v); clearError('db'); }}
                  style={styles.toggleBtn}
                >
                  <Text style={styles.toggleBtnText}>
                    {useManualDb ? '▼ Pick from list' : '✏ Enter manually'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Dropdown selector */}
            {!useManualDb && (
              <Field error={errors.db}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (databases.length > 0) setDbDropdownOpen((o) => !o);
                    else { showToastMessage('Tap "Fetch Databases" first'); }
                  }}
                  style={[styles.nativeInput, styles.dbSelector, errors.db && styles.inputError]}
                >
                  <Text style={selectedDb ? styles.dbSelectedText : styles.dbPlaceholderText}>
                    {selectedDb || (databases.length === 0 ? 'Tap "Fetch Databases" first' : 'Select a database')}
                  </Text>
                  <Text style={styles.chevron}>{dbDropdownOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {dbDropdownOpen && databases.length > 0 && (
                  <View style={styles.dropdown}>
                    <ScrollView
                      nestedScrollEnabled={true}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={true}
                      style={styles.dropdownScroll}
                    >
                      {databases.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={[styles.dropdownItem, item === selectedDb && styles.dropdownItemActive]}
                          onPress={() => {
                            setSelectedDb(item);
                            clearError('db');
                            setDbDropdownOpen(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, item === selectedDb && styles.dropdownItemTextActive]}>
                            {item}
                          </Text>
                          {item === selectedDb && <Text style={styles.checkmark}>✓</Text>}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </Field>
            )}

            {/* Manual DB input */}
            {useManualDb && (
              <Field error={errors.db}>
                <TextInputNative
                  value={manualDb}
                  onChangeText={(t) => { setManualDb(t); clearError('db'); }}
                  onFocus={() => clearError('db')}
                  placeholder="e.g. nexgenn-restaurant"
                  placeholderTextColor="#bbb"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.nativeInput, errors.db && styles.inputError]}
                />
              </Field>
            )}

            {!fetchAttempted && (
              <TouchableOpacity
                onPress={() => { setUseManualDb(true); setFetchAttempted(true); clearError('db'); }}
                style={styles.manualLink}
              >
                <Text style={styles.manualLinkText}>Enter database name manually</Text>
              </TouchableOpacity>
            )}

            <View style={styles.divider} />

            {/* Register button */}
            <TouchableOpacity
              style={[styles.registerBtn, isLoading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {loadingRegister ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.registerBtnText}>Register Device</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.hint}>
              This device will be saved in the Odoo Device Registry.{'\n'}
              You only need to do this once per device.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 28,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: FONT_FAMILY.urbanistBold,
    color: '#fff',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 19,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 20,
    minHeight: 500,
  },

  // Step rows
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: {
    color: '#fff',
    fontSize: 12,
    fontFamily: FONT_FAMILY.urbanistBold,
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.urbanistBold,
    color: '#2e2a4f',
    flex: 1,
  },
  optional: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: FONT_FAMILY.urbanistBold,
  },

  // Fields
  fieldGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: '#888',
    marginBottom: 5,
    marginLeft: 2,
  },
  labelRequired: {
    color: '#e74c3c',
  },
  nativeInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#222',
    backgroundColor: '#fafafa',
    fontFamily: FONT_FAMILY.urbanistBold,
  },
  inputError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fff8f8',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },

  // DB selector
  dbSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dbSelectedText: {
    color: '#222',
    fontSize: 14,
    fontFamily: FONT_FAMILY.urbanistBold,
    flex: 1,
  },
  dbPlaceholderText: {
    color: '#bbb',
    fontSize: 14,
    flex: 1,
  },
  chevron: {
    color: '#999',
    fontSize: 11,
    marginLeft: 6,
  },

  // Dropdown
  dropdown: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginTop: 4,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    maxHeight: 220,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownItemActive: {
    backgroundColor: LIGHT_PURPLE,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownItemTextActive: {
    color: PURPLE,
    fontFamily: FONT_FAMILY.urbanistBold,
  },
  checkmark: {
    color: PURPLE,
    fontSize: 14,
    fontFamily: FONT_FAMILY.urbanistBold,
  },

  // Buttons
  fetchBtn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 6,
    opacity: 1,
  },
  fetchBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: FONT_FAMILY.urbanistBold,
  },
  registerBtn: {
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
    elevation: 2,
    shadowColor: PURPLE,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  registerBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONT_FAMILY.urbanistBold,
    letterSpacing: 0.3,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Toggle / manual link
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: LIGHT_PURPLE,
    borderRadius: 20,
  },
  toggleBtnText: {
    color: PURPLE,
    fontSize: 11,
    fontFamily: FONT_FAMILY.urbanistBold,
  },
  manualLink: {
    alignSelf: 'center',
    marginTop: 2,
    marginBottom: 6,
    padding: 4,
  },
  manualLinkText: {
    color: PURPLE,
    fontSize: 13,
    textDecorationLine: 'underline',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#f0e8f4',
    marginVertical: 18,
  },

  // Hint
  hint: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
});

export default DeviceSetupScreen;
