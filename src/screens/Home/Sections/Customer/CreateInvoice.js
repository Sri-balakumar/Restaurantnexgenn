
import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Platform, StatusBar, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationHeader } from '@components/Header';
import { useProductStore } from '@stores/product';
import { COLORS } from '@constants/theme';
import { createInvoiceOdoo, postInvoiceOdoo, linkInvoiceToPosOrderOdoo, fetchFieldSelectionOdoo } from '@api/services/generalApi';
import { formatCurrency } from '@utils/formatters/currency';

const CreateInvoice = ({ navigation, route }) => {
  const cart = useProductStore((s) => s.getCurrentCart()) || [];
  const [loading, setLoading] = useState(false);

  const items = useMemo(() => cart.map(it => {
    const qty = Number(it.quantity ?? it.qty ?? 1);
    const unit = Number(it.price_unit ?? it.price ?? 0);
    // price_subtotal_incl and price_subtotal are already per-line totals from Odoo
    const lineTotal = (typeof it.price_subtotal_incl === 'number' && !isNaN(it.price_subtotal_incl))
      ? it.price_subtotal_incl
      : (typeof it.price_subtotal === 'number' && !isNaN(it.price_subtotal)
          ? it.price_subtotal
          : qty * unit);
    return {
      id: String(it.id),
      qty,
      name: it.name || (Array.isArray(it.product_id) ? it.product_id[1] : 'Product'),
      unit,
      subtotal: lineTotal,
    };
  }), [cart]);

  const subtotal = useMemo(() => items.reduce((s, it) => s + (it.subtotal || 0), 0), [items]);
  const tax = +(subtotal * 0.00).toFixed(2); // placeholder tax 0%
  const service = +(subtotal * 0.00).toFixed(2); // placeholder service charge
  const total = +(subtotal + tax + service).toFixed(2);

  const renderLine = ({ item, index }) => (
    <View key={item.id} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: index === items.length - 1 ? 0 : 1, borderColor: '#f0f0f0' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Text style={{ fontWeight: '700', marginRight: 12, width: 28 }}>{item.qty}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700' }}>{item.name}</Text>
        </View>
      </View>
      <View style={{ width: 120, alignItems: 'flex-end' }}>
        <Text style={{ fontWeight: '700' }}>{formatCurrency(item.subtotal || (item.unit * item.qty))}</Text>
        <Text style={{ fontSize: 12, color: '#666' }}>{`@ ${formatCurrency(item.unit).replace(/^\w+\s/, '')}`}</Text>
      </View>
    </View>
  );

  // Save Invoice handler
  const handleSaveInvoice = async () => {
    if (!cart.length) {
      Alert.alert('No items', 'There are no items to invoice.');
      return;
    }
    setLoading(true);
    try {
      // For demo: use first product's partner_id if present, else fallback
      const partnerId = cart[0]?.partner_id || 1; // TODO: Replace 1 with actual customer selection
      // Map cart items to Odoo invoice line format, validate IDs
      const products = cart.map(it => {
        // Prefer product_id from Odoo relation, else remoteId, else numeric id
        let productId = null;
        if (Array.isArray(it.product_id) && Number.isInteger(it.product_id[0])) {
          productId = it.product_id[0];
        } else if (Number.isInteger(it.remoteId)) {
          productId = it.remoteId;
        } else if (Number.isInteger(it.id)) {
          productId = it.id;
        } else if (typeof it.id === 'string' && /^odoo_line_\d+$/.test(it.id)) {
          // prevent misusing order line id as product; keep null to let Odoo accept name+price
          productId = null;
        }

        // Normalize tax ids: accept [id] or [[id, name]] or ids as strings
        let taxIds = [];
        if (Array.isArray(it.tax_ids)) {
          taxIds = it.tax_ids
            .map(t => Array.isArray(t) ? t[0] : (typeof t === 'string' ? parseInt(t, 10) : t))
            .filter((v) => Number.isInteger(v));
        }

        return {
          id: productId,
          name: it.name || (Array.isArray(it.product_id) ? it.product_id[1] : ''),
          quantity: Number(it.quantity ?? it.qty ?? 1),
          price_unit: Number(it.price_unit ?? it.price ?? 0),
          tax_ids: taxIds,
        };
      });
      // Log payload for debugging
      console.log('[INVOICE DEBUG] Payload to Odoo:', { partnerId, products });
      // Always include today's date as invoiceDate
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const invoiceDate = `${yyyy}-${mm}-${dd}`;
      const result = await createInvoiceOdoo({ partnerId, products, invoiceDate });
      setLoading(false);
      if (result && result.id) {
        // Only create draft, do NOT post
        Alert.alert('Invoice Saved', `Draft invoice #${result.id} has been created.`, [
          { text: 'OK', onPress: () => navigation.navigate('CreateInvoicePreview', { items, subtotal, tax, service, total, orderId: result.id, invoiceNumber: null }) }
        ]);
        // Optionally link to POS order as draft (skip state change logic)
        try {
          const linkResp = await linkInvoiceToPosOrderOdoo({ orderId: route.params.orderId, invoiceId: result.id, setState: false });
          console.log('[CREATE INVOICE] Linked draft invoice to order:', linkResp);
        } catch (linkErr) {
          console.warn('[CREATE INVOICE] Failed to link draft invoice to order:', linkErr);
        }
      } else {
        Alert.alert('Error', 'Failed to save invoice.');
      }
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', err.message || 'Failed to save invoice.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top', 'left', 'right']}>
      <View style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0 }}>
        <NavigationHeader title="Invoice" onBackPress={() => navigation.goBack()} />
      </View>

      <View style={{ padding: 16 }}>
        <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image source={require('@assets/images/logo/logo.png')} style={{ width: 48, height: 48, resizeMode: 'contain', marginRight: 12 }} />
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800' }}>My Restaurant</Text>
                <Text style={{ color: '#6b7280' }}>123 Main St, City</Text>
                <Text style={{ color: '#6b7280' }}>Phone: (123) 456-7890</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 14, fontWeight: '800' }}>Invoice</Text>
              <Text style={{ color: '#6b7280' }}>{`#${route?.params?.orderId || '—'}`}</Text>
              <Text style={{ color: '#6b7280' }}>{new Date().toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' }}>
          <View style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee', backgroundColor: '#fafafa' }}>
            <Text style={{ fontWeight: '800' }}>Items</Text>
          </View>
          <FlatList
            data={items}
            keyExtractor={i => i.id}
            renderItem={renderLine}
            ListEmptyComponent={<View style={{ padding: 24 }}><Text style={{ color: '#666' }}>No items to invoice</Text></View>}
            contentContainerStyle={{}}
          />

          <View style={{ padding: 16, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#6b7280' }}>Subtotal</Text>
              <Text style={{ fontWeight: '800' }}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#6b7280' }}>Service</Text>
              <Text style={{ fontWeight: '800' }}>{formatCurrency(service)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: '#6b7280' }}>Tax</Text>
              <Text style={{ fontWeight: '800' }}>{formatCurrency(tax)}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: '#efefef', marginVertical: 8 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '900' }}>Total</Text>
              <Text style={{ fontSize: 20, fontWeight: '900' }}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <TouchableOpacity onPress={handleSaveInvoice} style={{ backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>{loading ? 'Saving...' : 'Save Invoice'}</Text>
          </TouchableOpacity>
          {loading && <ActivityIndicator style={{ marginTop: 12 }} color={COLORS.primary || '#111827'} />}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CreateInvoice;
