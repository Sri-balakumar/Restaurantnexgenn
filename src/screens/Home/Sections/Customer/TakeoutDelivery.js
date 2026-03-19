import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { NavigationHeader } from '@components/Header';
import { useProductStore } from '@stores/product';
import { COLORS } from '@constants/theme';
import { formatCurrency } from '@utils/formatters/currency';
<<<<<<< HEAD
import { useTranslation } from '@hooks';

const TakeoutDelivery = ({ navigation, route }) => {
  const cart = useProductStore((s) => s.getCurrentCart()) || [];
  const { t } = useTranslation();
=======

const TakeoutDelivery = ({ navigation, route }) => {
  const cart = useProductStore((s) => s.getCurrentCart()) || [];
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
  // map cart to items with qty and price
  const items = useMemo(() => cart.map(it => ({
    id: String(it.id),
    qty: Number(it.quantity ?? it.qty ?? 1),
    name: it.name || (it.product_id && it.product_id[1]) || 'Product',
    unit: Number(it.price_unit ?? it.price ?? 0),
    subtotal: ( (typeof it.price_subtotal_incl === 'number' ? it.price_subtotal_incl : (typeof it.price_subtotal === 'number' ? it.price_subtotal : (it.price_unit ?? it.price ?? 0))) ) * (Number(it.quantity ?? it.qty ?? 1)),
  })), [cart]);

  const total = useMemo(() => items.reduce((s, it) => s + (it.subtotal || (it.unit * it.qty)), 0), [items]);

  const renderLine = ({ item }) => (
    <View style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontWeight: '700', marginRight: 12 }}>{item.qty}</Text>
        <Text style={{ fontSize: 16 }}>{item.name}</Text>
      </View>
      <Text style={{ fontWeight: '800' }}>{formatCurrency(item.subtotal || (item.unit * item.qty))}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
<<<<<<< HEAD
      <NavigationHeader title={t.register} onBackPress={() => navigation.goBack()} />
=======
      <NavigationHeader title="Register" onBackPress={() => navigation.goBack()} />
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
      <View style={{ flex: 1 }}>
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={renderLine}
<<<<<<< HEAD
          ListEmptyComponent={<View style={{ padding: 24 }}><Text style={{ color: '#666' }}>{t.noItems}</Text></View>}
=======
          ListEmptyComponent={<View style={{ padding: 24 }}><Text style={{ color: '#666' }}>No items</Text></View>}
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
          contentContainerStyle={{ paddingBottom: 200 }}
        />

        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
<<<<<<< HEAD
            <Text style={{ fontSize: 18, fontWeight: '800' }}>{t.total}</Text>
=======
            <Text style={{ fontSize: 18, fontWeight: '800' }}>Total</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
            <Text style={{ fontSize: 20, fontWeight: '900' }}>{formatCurrency(total)}</Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-start', flexWrap: 'wrap', marginBottom: 12 }}>
            <TouchableOpacity style={{ backgroundColor: '#f3f4f6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginRight: 8, marginBottom: 8 }}>
              <Text style={{ fontWeight: '800', color: '#6b21a8' }}>{route?.params?.userName || 'John Doe'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#f3f4f6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginRight: 8, marginBottom: 8 }}>
<<<<<<< HEAD
              <Text style={{ fontWeight: '800', color: '#111' }}>{t.note}</Text>
=======
              <Text style={{ fontWeight: '800', color: '#111' }}>Note</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#dbeafe', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginRight: 8, marginBottom: 8 }}>
              <Text style={{ fontWeight: '800', color: '#0f172a' }}>{route?.params?.presetName || 'Dine In'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#f3f4f6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginRight: 8, marginBottom: 8 }}>
<<<<<<< HEAD
              <Text style={{ fontWeight: '800' }}>{t.course}</Text>
=======
              <Text style={{ fontWeight: '800' }}>Course</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#f3f4f6', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginRight: 8, marginBottom: 8 }}>
              <Text style={{ fontWeight: '800' }}>⋮</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => navigation.navigate('TablesScreen')} style={{ flex: 1, backgroundColor: '#f3f4f6', paddingVertical: 18, borderRadius: 8, marginRight: 8, alignItems: 'center' }}>
<<<<<<< HEAD
              <Text style={{ fontWeight: '800', fontSize: 18 }}>{t.newOrder}</Text>
=======
              <Text style={{ fontWeight: '800', fontSize: 18 }}>New</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
            </TouchableOpacity>

            <View style={{ flex: 1, flexDirection: 'column' }}>
              <TouchableOpacity onPress={() => navigation.navigate('CreateInvoice', { orderId: route?.params?.orderId })} style={{ backgroundColor: '#f3f4f6', paddingVertical: 10, borderRadius: 8, marginBottom: 8, alignItems: 'center' }}>
<<<<<<< HEAD
                <Text style={{ fontWeight: '800' }}>{t.createInvoice}</Text>
=======
                <Text style={{ fontWeight: '800' }}>Create Invoice</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default TakeoutDelivery;
