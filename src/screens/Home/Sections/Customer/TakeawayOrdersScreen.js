import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { NavigationHeader } from '@components/Header';
import { SafeAreaView } from '@components/containers';
import { fetchPosPresets, fetchOrders, fetchPosOrderById, fetchOrderLinesByIds } from '@api/services/generalApi';

const TakeawayOrdersScreen = ({ navigation, route }) => {
  const { sessionId, userId, userName } = route?.params || {};
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const presetsResp = await fetchPosPresets();
        const presets = (presetsResp && presetsResp.result) || [];
        const takePresetIds = presets.filter(p => String(p.name || '').toLowerCase().includes('take')).map(p => p.id);

        const ordersResp = await fetchOrders({ sessionId, limit: 500, fields: ['id','name','state','amount_total','table_id','create_date','preset_id'] });
        const all = (ordersResp && ordersResp.result) || [];
        const filtered = all.filter(o => {
          const p = Array.isArray(o.preset_id) ? o.preset_id[0] : o.preset_id;
          if (p && takePresetIds.includes(p)) return true;
          // fallback: check preset name by fetching full order
          return false;
        });
        setOrders(filtered);
      } catch (e) {
        console.warn('Failed to load takeaway orders', e);
        Alert.alert('Error', 'Failed to load takeaway orders');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  const openOrder = async (order) => {
    try {
      const orderResp = await fetchPosOrderById(order.id);
      const rec = orderResp && orderResp.result ? orderResp.result : null;
      const lineIds = rec && Array.isArray(rec.lines) ? rec.lines : [];
      let orderLines = [];
      if (lineIds.length > 0) {
        const linesResp = await fetchOrderLinesByIds(lineIds);
        orderLines = linesResp && linesResp.result ? linesResp.result : [];
      }
      navigation.navigate('POSProducts', { ...route?.params, orderId: order.id, orderLines, cartOwner: `order_${order.id}`, order_type: 'TAKEAWAY' });
    } catch (e) {
      console.warn('Could not open order', e);
      Alert.alert('Error', 'Failed to open order');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => openOrder(item)} style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
      <Text style={{ fontWeight: '800' }}>{item.name} <Text style={{ color: '#fff' }}>#{item.id}</Text></Text>
      <Text style={{ color: '#fff' }}>{item.create_date}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <NavigationHeader title="Takeaway Orders" onBackPress={() => navigation.goBack()} />
      <View style={{ flex: 1, paddingTop: 80 }}>
        {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
          <FlatList data={orders} keyExtractor={o => String(o.id)} renderItem={renderItem} ListEmptyComponent={<Text style={{ padding: 16 }}>No takeaway orders found.</Text>} />
        )}
      </View>
    </SafeAreaView>
  );
};

export default TakeawayOrdersScreen;
