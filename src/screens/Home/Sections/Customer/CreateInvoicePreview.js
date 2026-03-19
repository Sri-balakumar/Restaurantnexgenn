import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationHeader } from '@components/Header';
import { formatCurrency } from '@utils/formatters/currency';

const CreateInvoicePreview = ({ navigation, route }) => {
  const { items = [], subtotal = 0, tax = 0, service = 0, total = 0, orderId, tableName } = route?.params || {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'left', 'right']}>
      <View style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0 }}>
        <NavigationHeader title="Invoice Preview" onBackPress={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '900' }}>My Restaurant</Text>
          <Text style={{ color: '#666' }}>123 Main St, City</Text>
          <Text style={{ color: '#666' }}>Phone: (123) 456-7890</Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: '800' }}>Table: {tableName || '—'}</Text>
          <Text style={{ color: '#666' }}>{new Date().toLocaleString()}</Text>
        </View>

        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' }}>
          {items.map((it, idx) => (
            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}>
              <Text style={{ fontWeight: '700' }}>{it.qty} x {it.name}</Text>
              <Text style={{ fontWeight: '700' }}>{formatCurrency(it.subtotal || 0)}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text>Subtotal</Text>
            <Text>{formatCurrency(Number(subtotal))}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text>Service</Text>
            <Text>{formatCurrency(Number(service))}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text>Tax</Text>
            <Text>{formatCurrency(Number(tax))}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: '#efefef', marginVertical: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 18, fontWeight: '900' }}>Total</Text>
            <Text style={{ fontSize: 18, fontWeight: '900' }}>{formatCurrency(Number(total))}</Text>
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <TouchableOpacity onPress={() => { console.warn('Implement print integration (react-native-print or share)'); }} style={{ backgroundColor: '#111827', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Print / Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateInvoicePreview;
