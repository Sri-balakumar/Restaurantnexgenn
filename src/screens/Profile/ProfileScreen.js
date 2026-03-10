import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '@components/Text';
import { ButtonContainer, SafeAreaView } from '@components/containers';
import { Button } from '@components/common/Button';
import { version as appVersion } from '../../../package.json';
import { COLORS, FONT_FAMILY } from '@constants/theme';
import { useAuthStore } from '@stores/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

const ProfileScreen = ({ navigation }) => {
  const userDetails = useAuthStore(state => state.user);
  const logoutStore = useAuthStore(state => state.logout);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userData');
      logoutStore();
    } catch (e) {
      console.warn('Failed to clear userData on logout', e);
    } finally {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  const name = userDetails?.related_profile?.name || userDetails?.user_name || 'Profile';
  const company = userDetails?.company?.name || '';
  const email = userDetails?.email || userDetails?.user_email || '';
  const phone = userDetails?.phone || userDetails?.mobile || '';

  const initials = name.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();

  return (
    <SafeAreaView backgroundColor={COLORS.primaryThemeColor}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || 'U'}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name}>{name}</Text>
            {company ? <Text style={styles.company}>{company}</Text> : null}
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => { /* placeholder for edit */ }}>
            <MaterialIcons name="edit" size={20} color={COLORS.primaryThemeColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {/** Display account/login details (exclude email/phone per request) */}
          <Text style={{ fontFamily: FONT_FAMILY.urbanistSemiBold, color: '#666', marginBottom: 8 }}>
            Account Details
          </Text>
          {(() => {
            const detailKeys = [
              { key: 'uid', label: 'UID' },
              { key: 'login', label: 'Login' },
              { key: 'user_name', label: 'Username' },
              { key: 'db', label: 'DB' },
              { key: 'partner_id', label: 'Partner' },
              { key: 'company_id', label: 'Company' },
              { key: 'session_id', label: 'Session' },
            ];

            return detailKeys.map(({ key, label }) => {
              const val = userDetails && userDetails[key];
              if (val === undefined || val === null) return null;
              let display = '';
              if (Array.isArray(val)) display = val[1] || String(val[0] || '');
              else if (typeof val === 'object') display = val.name || JSON.stringify(val);
              else display = String(val);

              if (!display || display === 'null') return null;

              return (
                <View key={key} style={styles.row}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={styles.rowValue}>{display}</Text>
                </View>
              );
            });
          })()}
        </View>

        <View style={styles.footer}>
          <ButtonContainer>
            <Button title="LOGOUT" onPress={handleLogout} paddingHorizontal={40} />
          </ButtonContainer>
        </View>
        <View style={{ alignItems: 'center', marginTop: 20, paddingBottom: 40 }}>
          <Text style={{ color: '#666' }}>App Version {appVersion}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = {
  container: { padding: 20, flexGrow: 1, backgroundColor: '#fff', minHeight: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.primaryThemeColor, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 28, fontFamily: FONT_FAMILY.urbanistBold },
  headerText: { marginLeft: 12, flex: 1 },
  name: { fontSize: 20, fontFamily: FONT_FAMILY.urbanistBold, color: '#111' },
  company: { fontSize: 13, color: '#666', marginTop: 4 },
  editBtn: { padding: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },
  card: { borderRadius: 12, padding: 12, backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#eee' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  rowLabel: { color: '#666', fontFamily: FONT_FAMILY.urbanistSemiBold },
  rowValue: { color: '#111', fontFamily: FONT_FAMILY.urbanistRegular },
  footer: { marginTop: 20, paddingBottom: 40 },
};

export default ProfileScreen;
