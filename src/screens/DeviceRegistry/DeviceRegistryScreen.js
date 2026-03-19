// src/screens/DeviceRegistry/DeviceRegistryScreen.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Platform,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { SafeAreaView, RoundedContainer } from '@components/containers';
import { NavigationHeader } from '@components/Header';
import { OverlayLoader } from '@components/Loader';
import Text from '@components/Text';
import { FONT_FAMILY } from '@constants/theme';
<<<<<<< HEAD
import { useTranslation } from '@hooks';
=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
import { fetchDeviceRegistry } from '@api/services/deviceRegistryApi';

const PURPLE = '#875a7b';
const AUTO_REFRESH_MS = 30000; // refresh every 30 seconds while screen is open

// ─── Device card ─────────────────────────────────────────────────────────────
<<<<<<< HEAD
const DeviceCard = ({ item, isCurrent, t }) => {
  const shortId = item.device_id
    ? `${item.device_id.substring(0, 8)}...`
    : t.na;

  let lastLogin = t.never;
=======
const DeviceCard = ({ item, isCurrent }) => {
  const shortId = item.device_id
    ? `${item.device_id.substring(0, 8)}...`
    : 'N/A';

  let lastLogin = 'Never';
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
  try {
    if (item.last_login) {
      lastLogin = format(new Date(item.last_login), 'dd MMM yyyy  HH:mm');
    }
  } catch (_) {}

  return (
    <View style={[styles.card, isCurrent && styles.cardCurrent]}>
      {isCurrent && <View style={styles.currentBar} />}

      <View style={styles.cardContent}>
        <View style={styles.row}>
          <Text style={styles.deviceName} numberOfLines={1}>
<<<<<<< HEAD
            {item.device_name || t.unknownDevice}
          </Text>
          {isCurrent && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t.thisDevice}</Text>
=======
            {item.device_name || 'Unknown Device'}
          </Text>
          {isCurrent && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>THIS DEVICE</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
            </View>
          )}
        </View>

        <View style={styles.row}>
          <View style={styles.infoChip}>
<<<<<<< HEAD
            <Text style={styles.chipLabel}>{t.uuid}</Text>
            <Text style={styles.chipValue}>{shortId}</Text>
          </View>
          <View style={styles.infoChip}>
            <Text style={styles.chipLabel}>{t.database}</Text>
            <Text style={styles.chipValue} numberOfLines={1}>
              {item.database_name || t.na}
=======
            <Text style={styles.chipLabel}>UUID</Text>
            <Text style={styles.chipValue}>{shortId}</Text>
          </View>
          <View style={styles.infoChip}>
            <Text style={styles.chipLabel}>Database</Text>
            <Text style={styles.chipValue} numberOfLines={1}>
              {item.database_name || 'N/A'}
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>
<<<<<<< HEAD
            🌐 {item.base_url || t.na}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>🕒 {t.lastLogin} {lastLogin}</Text>
=======
            🌐 {item.base_url || 'N/A'}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>🕒 Last login: {lastLogin}</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
        </View>
      </View>
    </View>
  );
};

// ─── Empty / Error state ──────────────────────────────────────────────────────
const StatusState = ({ icon, message, sub }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyIcon}>{icon}</Text>
    <Text style={styles.emptyText}>{message}</Text>
    {!!sub && <Text style={styles.subText}>{sub}</Text>}
  </View>
);

// ─── Main screen ─────────────────────────────────────────────────────────────
const DeviceRegistryScreen = ({ navigation }) => {
<<<<<<< HEAD
  const { t } = useTranslation();
=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUuid, setCurrentUuid] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const intervalRef = useRef(null);

  const loadDevices = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      const uuid = await AsyncStorage.getItem('device_uuid');
      setCurrentUuid(uuid);

      const result = await fetchDeviceRegistry();
      setDevices(result);
    } catch (err) {
      setErrorMsg(err.message);
      setDevices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Auto-refresh every 30s while screen is focused; clean up on blur
  useFocusEffect(
    useCallback(() => {
      loadDevices();
      intervalRef.current = setInterval(() => {
        loadDevices(true);
      }, AUTO_REFRESH_MS);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [loadDevices])
  );

  const renderItem = ({ item }) => (
    <DeviceCard
      item={item}
      isCurrent={!!currentUuid && item.device_id === currentUuid}
<<<<<<< HEAD
      t={t}
=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
    />
  );

  const renderEmpty = () => {
    if (loading) return null;

    if (errorMsg) {
      return (
        <StatusState
          icon="⚠️"
<<<<<<< HEAD
          message={t.couldNotLoadDevices}
=======
          message="Could not load devices"
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
          sub={errorMsg}
        />
      );
    }

    return (
      <StatusState
        icon="📋"
<<<<<<< HEAD
        message={t.noRegisteredDevices}
=======
        message="No registered devices found."
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
      />
    );
  };

  return (
    <SafeAreaView>
      <OverlayLoader visible={loading} />
      <NavigationHeader
<<<<<<< HEAD
        title={t.deviceRegistry}
=======
        title="Device Registry"
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
        onBackPress={() => navigation.goBack()}
        refreshIcon
        refreshPress={() => loadDevices(true)}
      />
      <RoundedContainer>
        <FlatList
          data={devices}
          keyExtractor={(item, index) =>
            item.device_id ? item.device_id : index.toString()
          }
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadDevices(true)}
              colors={[PURPLE]}
              tintColor={PURPLE}
            />
          }
        />
      </RoundedContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 12,
    paddingBottom: 80,
    flexGrow: 1,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
    }),
  },
  cardCurrent: {
    borderWidth: 1,
    borderColor: PURPLE,
  },
  currentBar: {
    width: 5,
    backgroundColor: PURPLE,
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  metaRow: {
    marginTop: 3,
  },

  deviceName: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.urbanistBold,
    color: '#1a1a2e',
    flex: 1,
    marginRight: 8,
  },

  badge: {
    backgroundColor: PURPLE,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: FONT_FAMILY.urbanistBold,
    letterSpacing: 0.5,
  },

  infoChip: {
    backgroundColor: '#f4f1f8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 10,
    color: '#999',
    fontFamily: FONT_FAMILY.urbanistBold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  chipValue: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.urbanistBold,
    color: '#333',
  },

  metaText: {
    fontSize: 12,
    color: '#888',
    fontFamily: FONT_FAMILY.urbanistBold,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    fontFamily: FONT_FAMILY.urbanistBold,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  subText: {
    fontSize: 12,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
});

export default DeviceRegistryScreen;
