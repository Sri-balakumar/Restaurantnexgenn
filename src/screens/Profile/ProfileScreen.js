import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '@components/Text';
import { SafeAreaView } from '@components/containers';
import { version as appVersion } from '../../../package.json';
import { COLORS, FONT_FAMILY } from '@constants/theme';
import { useAuthStore } from '@stores/auth';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from '@hooks';
import { useLanguageStore } from '@stores/language';

const NAVY = '#2E294E';
const ORANGE = '#F47B20';

const ProfileScreen = () => {
  const userDetails = useAuthStore(state => state.user);
  const { t, language, isRTL } = useTranslation();
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const name = userDetails?.related_profile?.name || userDetails?.name || userDetails?.user_name || 'User';
  const company = userDetails?.company_id
    ? (Array.isArray(userDetails.company_id) ? userDetails.company_id[1] : userDetails.company_id)
    : (userDetails?.company?.name || '');
  const login = userDetails?.login || userDetails?.user_email || '';

  const initials = name.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  const detailKeys = [
    { key: 'uid', label: t.userId, icon: 'badge' },
    { key: 'login', label: t.login, icon: 'alternate-email' },
    { key: 'db', label: t.database, icon: 'storage' },
    { key: 'partner_id', label: t.partner, icon: 'person-outline' },
    { key: 'company_id', label: t.company, icon: 'business' },
  ];

  const rtlTextStyle = isRTL ? { textAlign: 'right', writingDirection: 'rtl' } : {};
  const rtlRowStyle = isRTL ? { flexDirection: 'row-reverse' } : {};

  return (
    <SafeAreaView backgroundColor={NAVY}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || 'U'}</Text>
          </View>
          <Text style={[styles.name, rtlTextStyle]}>{name}</Text>
          {company ? <Text style={[styles.company, rtlTextStyle]}>{company}</Text> : null}
          {login ? <Text style={[styles.loginText, rtlTextStyle]}>{login}</Text> : null}

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
        </View>

        {/* ── Account Details card ── */}
        <View style={styles.card}>
          <View style={[styles.cardHeader, rtlRowStyle]}>
            <View style={styles.cardDot} />
            <Text style={[styles.cardTitle, rtlTextStyle]}>{t.accountDetails}</Text>
          </View>

          {detailKeys.map(({ key, label, icon }) => {
            const val = userDetails && userDetails[key];
            if (val === undefined || val === null) return null;
            let display = '';
            if (Array.isArray(val)) display = val[1] || String(val[0] || '');
            else if (typeof val === 'object') display = val.name || JSON.stringify(val);
            else display = String(val);
            if (!display || display === 'null') return null;

            return (
              <View key={key} style={[styles.row, rtlRowStyle]}>
                <View style={[styles.rowLeft, rtlRowStyle]}>
                  <View style={styles.iconBox}>
                    <MaterialIcons name={icon} size={16} color={ORANGE} />
                  </View>
                  <Text style={[styles.rowLabel, rtlTextStyle]}>{label}</Text>
                </View>
                <Text style={[styles.rowValue, rtlTextStyle]} numberOfLines={1}>{display}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.version}>Powered by 369ai  |  v{appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 4,
    shadowColor: ORANGE,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontFamily: FONT_FAMILY.urbanistBold,
  },
  name: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.urbanistBold,
    color: '#fff',
    marginBottom: 4,
  },
  company: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: FONT_FAMILY.urbanistSemiBold,
    marginBottom: 2,
  },
  loginText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: FONT_FAMILY.urbanistRegular,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#fff',
    padding: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardDot: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: ORANGE,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.urbanistBold,
    color: NAVY,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#fff8f3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.urbanistSemiBold,
    color: '#666',
  },
  rowValue: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.urbanistBold,
    color: NAVY,
    maxWidth: '45%',
    textAlign: 'right',
  },
  version: {
    textAlign: 'center',
    marginTop: 24,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: FONT_FAMILY.urbanistRegular,
  },
  langToggleWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 3,
    marginTop: 16,
  },
  langBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 17,
  },
  langBtnActive: {
    backgroundColor: ORANGE,
  },
  langBtnText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.urbanistBold,
    color: 'rgba(255,255,255,0.6)',
  },
  langBtnTextActive: {
    color: '#fff',
  },
});

export default ProfileScreen;
