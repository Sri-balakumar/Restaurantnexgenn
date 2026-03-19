import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, FlatList, ActivityIndicator, Image, Animated, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from '@components/containers';
import { NavigationHeader } from '@components/Header';
import { Button } from '@components/common/Button';
import { fetchPOSRegisters, fetchPOSSessions, createPOSSesionOdoo, closePOSSesionOdoo } from '@api/services/generalApi';
<<<<<<< HEAD
import { useTranslation } from '@hooks';
=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f

// 3D Animated Card wrapper
const Card3D = ({ children, style, delay = 0 }) => {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, delay, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 7, tension: 60, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity: opacityAnim, transform: [{ scale: scaleAnim }, { translateY }, { perspective: 1000 }] }]}>
      {children}
    </Animated.View>
  );
};

const POSRegister = ({ navigation }) => {
<<<<<<< HEAD
  const { t } = useTranslation();
=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
  const [registers, setRegisters] = useState([]);
  const [openSessions, setOpenSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRegistersAndSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const [regs, sessions] = await Promise.all([
        fetchPOSRegisters({ limit: 20 }),
        fetchPOSSessions({ state: 'opened' })
      ]);
      setRegisters(Array.isArray(regs) ? regs : []);
      setOpenSessions(Array.isArray(sessions) ? sessions : []);
    } catch (err) {
<<<<<<< HEAD
      setError(t.failedToLoadRegisters);
=======
      setError('Failed to load POS registers or sessions');
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistersAndSessions();
  }, []);

  const handleOpenRegisterSession = async (register) => {
    setLoading(true);
    try {
      const resp = await createPOSSesionOdoo({ configId: register.id });
      if (resp && resp.error) {
<<<<<<< HEAD
        Alert.alert(t.error, resp.error.message || t.failedToOpenRegister);
      } else {
        Alert.alert(t.registerOpened, `Session ID: ${resp.result}`);
=======
        Alert.alert('Error', resp.error.message || 'Failed to open register');
      } else {
        Alert.alert('Register Opened', `Session ID: ${resp.result}`);
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
        const sessions = await fetchPOSSessions({ state: 'opened' });
        setOpenSessions(sessions);
      }
    } catch (err) {
<<<<<<< HEAD
      Alert.alert(t.error, err?.message || t.failedToOpenRegister);
=======
      Alert.alert('Error', err?.message || 'Failed to open register');
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRegisterSession = async (sessionId) => {
    Alert.alert(
<<<<<<< HEAD
      t.closeRegister,
      t.closeRegisterConfirm,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.close,
=======
      'Close Register',
      'Are you sure you want to close this register?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const resp = await closePOSSesionOdoo({ sessionId });
              if (resp && resp.error) {
<<<<<<< HEAD
                Alert.alert(t.error, resp.error.message || t.failedToCloseRegister);
              } else {
                Alert.alert(t.registerClosed, t.sessionClosedSuccess);
=======
                Alert.alert('Error', resp.error.message || 'Failed to close register');
              } else {
                Alert.alert('Register Closed', 'Session closed successfully');
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
                const sessions = await fetchPOSSessions({ state: 'opened' });
                setOpenSessions(sessions);
              }
            } catch (err) {
<<<<<<< HEAD
              Alert.alert(t.error, err?.message || t.failedToCloseRegister);
=======
              Alert.alert('Error', err?.message || 'Failed to close register');
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleContinueSelling = (session) => {
    navigation.navigate('ChooseOrderType', {
      sessionId: session.id,
      registerName: session.name,
      userId: session.user_id?.[0],
      userName: session.user_id?.[1],
      openingAmount: session.cash_register_balance_start || 0,
    });
  };

  const renderOpenSession = ({ item, index }) => {
    return (
      <Card3D style={s.card3dWrapper} delay={index * 100}>
        {/* Top accent bar */}
        <View style={s.accentBarGreen} />
        <View style={s.cardInner}>
          {/* Header row */}
          <View style={s.headerRow}>
            <View style={s.iconCircle}>
              <Image source={require('@assets/images/logo/logo.png')} style={s.logoImg} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.cardTitle}>{item.config_id?.[1] || item.config_id?.[0] || 'Restaurant'}</Text>
<<<<<<< HEAD
              <Text style={s.cardMeta}>{`${t.session} #${item.id}`}</Text>
            </View>
            <View style={s.statusBadgeActive}>
              <View style={s.statusDot} />
              <Text style={s.statusText}>{t.active}</Text>
=======
              <Text style={s.cardMeta}>Session #{item.id}</Text>
            </View>
            <View style={s.statusBadgeActive}>
              <View style={s.statusDot} />
              <Text style={s.statusText}>Active</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
            </View>
          </View>

          {/* Separator */}
          <View style={s.separator} />

          {/* Info rows */}
          <View style={s.infoGrid}>
            <View style={s.infoItem}>
              <Text style={s.infoIcon}>👤</Text>
              <View>
<<<<<<< HEAD
                <Text style={s.infoLabel}>{t.user}</Text>
=======
                <Text style={s.infoLabel}>User</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
                <Text style={s.infoValue}>{item.user_id?.[1] || '—'}</Text>
              </View>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoIcon}>🕒</Text>
              <View>
<<<<<<< HEAD
                <Text style={s.infoLabel}>{t.openedAt}</Text>
=======
                <Text style={s.infoLabel}>Opened At</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
                <Text style={s.infoValue}>{item.start_at ? new Date(item.start_at).toLocaleString() : '—'}</Text>
              </View>
            </View>
            <View style={s.infoItem}>
              <Text style={s.infoIcon}>💰</Text>
              <View>
<<<<<<< HEAD
                <Text style={s.infoLabel}>{t.openingAmount}</Text>
=======
                <Text style={s.infoLabel}>Opening Amount</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
                <Text style={[s.infoValue, s.amountValue]}>{typeof item.cash_register_balance_start === 'number' ? `₹ ${item.cash_register_balance_start.toFixed(2)}` : '—'}</Text>
              </View>
            </View>
          </View>

          {/* Action buttons */}
          <View style={s.actionRow}>
            <TouchableOpacity style={s.btnContinue} activeOpacity={0.8} onPress={() => handleContinueSelling(item)}>
<<<<<<< HEAD
              <Text style={s.btnContinueText}>{t.continueSelling}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnClose} activeOpacity={0.8} onPress={() => handleCloseRegisterSession(item.id)}>
              <Text style={s.btnCloseText}>{t.close}</Text>
=======
              <Text style={s.btnContinueText}>Continue Selling</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnClose} activeOpacity={0.8} onPress={() => handleCloseRegisterSession(item.id)}>
              <Text style={s.btnCloseText}>Close</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
            </TouchableOpacity>
          </View>
        </View>
      </Card3D>
    );
  };

  const renderRegister = ({ item, index }) => (
    <Card3D style={s.card3dWrapper} delay={(openSessions.length + index) * 100}>
      {/* Top accent bar */}
      <View style={s.accentBarBlue} />
      <View style={s.cardInner}>
        {/* Header row */}
        <View style={s.headerRow}>
          <View style={[s.iconCircle, s.iconCircleBlue]}>
            <Image source={require('@assets/images/logo/logo.png')} style={s.logoImg} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.cardTitle}>{item.name}</Text>
<<<<<<< HEAD
            <Text style={s.cardMeta}>{`${t.registerId} #${item.id}`}</Text>
          </View>
          <View style={s.statusBadgeIdle}>
            <Text style={s.statusTextIdle}>{t.available}</Text>
=======
            <Text style={s.cardMeta}>Register ID #{item.id}</Text>
          </View>
          <View style={s.statusBadgeIdle}>
            <Text style={s.statusTextIdle}>Available</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
          </View>
        </View>

        {/* Separator */}
        <View style={s.separator} />

<<<<<<< HEAD
        <Text style={s.registerDesc}>{t.tapToOpenRegister}</Text>

        {/* Action button */}
        <TouchableOpacity style={s.btnOpen} activeOpacity={0.8} onPress={() => handleOpenRegisterSession(item)}>
          <Text style={s.btnOpenText}>{t.openRegister}</Text>
=======
        <Text style={s.registerDesc}>Tap below to open this register and start a new selling session.</Text>

        {/* Action button */}
        <TouchableOpacity style={s.btnOpen} activeOpacity={0.8} onPress={() => handleOpenRegisterSession(item)}>
          <Text style={s.btnOpenText}>Open Register</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
        </TouchableOpacity>
      </View>
    </Card3D>
  );

  // Filter out registers that already have open sessions
  const openConfigIds = openSessions.map(s => Number(s.config_id?.[0]));
  const availableRegisters = registers.filter(r => !openConfigIds.includes(Number(r.id)));

  return (
    <SafeAreaView style={s.container}>
<<<<<<< HEAD
      <NavigationHeader title={t.posRegister} onBackPress={() => navigation.goBack()} logo={false} />
=======
      <NavigationHeader title="POS Register" onBackPress={() => navigation.goBack()} logo={false} />
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f

      {/* Centered logo with glow */}
      <View style={s.logoWrap}>
        <View style={s.logoGlow} />
        <Image source={require('@assets/images/logo2.png')} style={s.logoImage} />
      </View>

      {loading ? (
        <View style={s.loaderWrap}>
          <ActivityIndicator size="large" color="#F47B20" />
<<<<<<< HEAD
          <Text style={s.loaderText}>{t.loadingRegisters}</Text>
=======
          <Text style={s.loaderText}>Loading registers...</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
        </View>
      ) : error ? (
        <View style={s.errorWrap}>
          <Text style={s.errorIcon}>⚠️</Text>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} activeOpacity={0.8} onPress={loadRegistersAndSessions}>
<<<<<<< HEAD
            <Text style={s.retryBtnText}>{t.retry}</Text>
=======
            <Text style={s.retryBtnText}>Retry</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[
<<<<<<< HEAD
            ...(openSessions.length > 0 ? [{ _type: 'sectionHeader', _title: t.activeSessions, _count: openSessions.length }] : []),
            ...openSessions.map(s => ({ ...s, _type: 'session' })),
            ...(availableRegisters.length > 0 ? [{ _type: 'sectionHeader', _title: t.availableRegisters, _count: availableRegisters.length }] : []),
=======
            ...(openSessions.length > 0 ? [{ _type: 'sectionHeader', _title: 'Active Sessions', _count: openSessions.length }] : []),
            ...openSessions.map(s => ({ ...s, _type: 'session' })),
            ...(availableRegisters.length > 0 ? [{ _type: 'sectionHeader', _title: 'Available Registers', _count: availableRegisters.length }] : []),
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
            ...availableRegisters.map(r => ({ ...r, _type: 'register' })),
          ]}
          keyExtractor={(item, idx) => item._type === 'sectionHeader' ? `header-${idx}` : `item-${item.id}`}
          renderItem={({ item, index }) => {
            if (item._type === 'sectionHeader') {
              return (
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionTitle}>{item._title}</Text>
                  <View style={s.countBadge}>
                    <Text style={s.countBadgeText}>{item._count}</Text>
                  </View>
                </View>
              );
            }
            if (item._type === 'session') return renderOpenSession({ item, index });
            return renderRegister({ item, index });
          }}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>📋</Text>
<<<<<<< HEAD
              <Text style={s.emptyText}>{t.noRegistersFound}</Text>
=======
              <Text style={s.emptyText}>No registers found</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const CARD_RADIUS = 18;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f8' },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    marginBottom: -40,
  },
  logoGlow: {
    position: 'absolute',
    width: 340,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  logoImage: {
    width: 260,
    height: 260,
    resizeMode: 'contain',
  },
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 32 },

  // 3D Card wrapper
  card3dWrapper: {
    marginBottom: 18,
    borderRadius: CARD_RADIUS,
    backgroundColor: '#fff',
    // Deep 3D shadow
    ...Platform.select({
      ios: {
        shadowColor: '#1a1a2e',
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 12,
      },
    }),
  },

  // Top accent bars
  accentBarGreen: {
    height: 5,
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    backgroundColor: '#27ae60',
  },
  accentBarBlue: {
    height: 5,
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    backgroundColor: '#2E294E',
  },

  cardInner: {
    padding: 18,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    overflow: 'hidden',
  },
  iconCircleBlue: {
    backgroundColor: '#eeecf5',
    borderColor: '#c4b5fd',
  },
  logoImg: {
    width: 46,
    height: 46,
    borderRadius: 12,
    resizeMode: 'contain',
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: 0.3,
  },
  cardMeta: {
    fontSize: 12,
    color: '#8896ab',
    marginTop: 2,
    fontWeight: '500',
  },

  // Status badges
  statusBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  statusBadgeIdle: {
    backgroundColor: '#eeecf5',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c4b5fd',
  },
  statusTextIdle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: '#e8ecf4',
    marginVertical: 14,
  },

  // Info grid
  infoGrid: {
    gap: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fc',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  infoIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: '#8896ab',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: '#1a1a2e',
    fontWeight: '700',
    marginTop: 1,
  },
  amountValue: {
    color: '#F47B20',
    fontSize: 17,
  },

  // Register description
  registerDesc: {
    fontSize: 14,
    color: '#6b7a90',
    lineHeight: 20,
    marginBottom: 16,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  btnContinue: {
    flex: 2,
    backgroundColor: '#2E294E',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    // Button shadow
    ...Platform.select({
      ios: { shadowColor: '#2E294E', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  btnContinueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btnClose: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e74c3c',
  },
  btnCloseText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '800',
  },
  btnOpen: {
    backgroundColor: '#F47B20',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    // Orange glow shadow
    ...Platform.select({
      ios: { shadowColor: '#F47B20', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
      android: { elevation: 8 },
    }),
  },
  btnOpenText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Section headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 14,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#2E294E',
    borderRadius: 12,
    zIndex: 20,
    ...Platform.select({
      ios: { shadowColor: '#2E294E', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: '#F47B20',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginLeft: 10,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

  // Loader
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 15,
    color: '#8896ab',
    fontWeight: '600',
  },

  // Error
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#2E294E',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    ...Platform.select({
      ios: { shadowColor: '#2E294E', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#8896ab',
    fontWeight: '600',
  },
});

export default POSRegister;
