import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';

import { SafeAreaView } from '@components/containers';
import { NavigationHeader } from '@components/Header';
import { createDraftPosOrderOdoo, fetchPosPresets } from '@api/services/generalApi';

const ChooseOrderType = ({ navigation, route }) => {
  const params = route?.params || {};

  const goDineIn = () => {
    navigation.navigate('TablesScreen', { ...params, order_type: 'DINEIN' });
  };

  const [loading, setLoading] = useState(false);

  const goTakeaway = async () => {
    setLoading(true);
    try {
      // Always create a fresh takeaway draft (do not reuse previous draft)
      const sessionId = params?.sessionId || null;
      const userId = params?.userId || null;
      // choose a preset (prefer takeaway)
      let preset_id = 10;
      let preset = { id: 10, name: 'Takeaway' };
      try {
        const resp = await fetchPosPresets({ limit: 200 });
        if (resp && resp.result && Array.isArray(resp.result) && resp.result.length > 0) {
          const take = resp.result.find(p => String(p.name).toLowerCase().includes('take'));
          const chosen = take || resp.result[0];
          preset_id = chosen.id;
          preset = { id: chosen.id, name: chosen.name };
        }
      } catch (e) {
        // ignore, will use fallback
      }

      const created = await createDraftPosOrderOdoo({ sessionId, userId, tableId: false, preset_id, order_type: 'TAKEAWAY' });
      if (created && created.result) {
        const orderId = created.result;
        navigation.navigate('POSProducts', { ...params, orderId, preset, preset_id, cartOwner: `order_${orderId}`, order_type: 'TAKEAWAY' });
      } else {
        Alert.alert('Error', 'Could not create takeaway order');
      }
    } catch (err) {
      console.error('goTakeaway error', err);
      Alert.alert('Error', err?.message || 'Failed to create takeaway order');
    } finally {
      setLoading(false);
    }
  };

  const openTakeawayOrders = () => {
    navigation.navigate('TakeawayOrders', { ...params });
  };

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title="Choose Order Type" onBackPress={() => navigation.goBack()} />
      <View style={styles.content}>
        <Text style={styles.title}>Select service type</Text>
        <TouchableOpacity style={[styles.btn, styles.dine]} onPress={goDineIn}>
          <Text style={styles.btnText}>DINE IN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.take]} onPress={goTakeaway}>
          <Text style={styles.btnText}>NEW TAKEOUT ORDER</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.take]} onPress={openTakeawayOrders}>
          <Text style={styles.btnText}>TAKEOUT ORDERS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', padding: 20, paddingTop: 40 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 16, alignSelf: 'flex-start', width: '100%', color: '#fff' },
  btn: { width: '100%', paddingVertical: 18, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  dine: { backgroundColor: '#2b6cb0' },
  take: { backgroundColor: '#16a34a' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 18 }
});

export default ChooseOrderType;
