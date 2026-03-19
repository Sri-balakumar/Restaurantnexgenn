import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from '@components/containers';
import { NavigationHeader } from '@components/Header';
import { Button } from '@components/common/Button';
import { COLORS } from '@constants/theme';
import { useState } from 'react';
import { Alert } from 'react-native';
import { createInvoiceOdoo } from '@api/services/generalApi';
import { useTranslation } from '@hooks';

const POSReceiptScreen = ({ navigation, route }) => {
  const { orderId, products = [], customer, amount, paymentMode, invoiceChecked } = route?.params || {};
  const { t } = useTranslation();
    useEffect(() => {
      if (invoiceChecked) {
        // Prepare invoice data
        const partnerId = (customer && (customer.id || customer.partner_id || customer.partner_id?.id)) || null;
        if (!partnerId) {
          Alert.alert(t.missingCustomer, t.cannotCreateInvoice);
          return;
        }
        const invoiceProducts = (products || []).map(p => ({ id: p.id, name: p.name, quantity: p.quantity || p.qty || 1, price: p.price }));
        (async () => {
          try {
            const resp = await createInvoiceOdoo({ partnerId, products: invoiceProducts });
            Alert.alert(t.invoiceCreated, `${t.invoiceCreatedWithId} ${resp.id}`);
          } catch (err) {
            Alert.alert(t.invoiceError, err.message || 'Failed to create invoice');
          }
        })();
      }
    }, [invoiceChecked]);
  const total = products.reduce((s, p) => s + ((p.price || 0) * (p.quantity || p.qty || 0)), 0);
  const totalVat = (total * 0.05).toFixed(3); // Example VAT calculation
  const totalInclVat = (total + parseFloat(totalVat)).toFixed(3);
  const balanceCash = (amount - totalInclVat).toFixed(3);

  // Determine payment mode label (case-insensitive, robust)
  let paymentModeLabel = t.cashPayment;
  const mode = (paymentMode || '').toLowerCase();
  if (mode === 'customer_account' || mode === 'cus_acc' || mode === 'customer account') {
    paymentModeLabel = t.customerAccountPayment;
  } else if (mode === 'card' || mode === 'credit_card' || mode === 'debit_card') {
    paymentModeLabel = t.cardPayment;
  } else if (mode === 'cash') {
    paymentModeLabel = t.cashPayment;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <NavigationHeader title={t.receipt} onBackPress={() => navigation.navigate('POSPayment', { orderId, products, customer, amount, paymentMode })} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.receiptBox}>
          <Text style={styles.title}>{t.nexGennPos}</Text>
          <Text style={styles.location}>{t.oman}</Text>
          <Text style={styles.invoiceType}>{t.simplifiedTaxInvoice}</Text>
          <View style={styles.divider} />
          <Text style={styles.cashier}>{t.cashierServedBy}</Text>
          <Text style={styles.invoiceNo}>No: {orderId || '000001'}</Text>
          <View style={styles.divider} />
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableHeaderCell}>{t.productName}</Text>
            <Text style={styles.tableHeaderCell}>{t.qtyLabel}</Text>
            <Text style={styles.tableHeaderCell}>{t.unitPrice}</Text>
            <Text style={styles.tableHeaderCell}>{t.tax}</Text>
            <Text style={styles.tableHeaderCell}>{t.totalLabel}</Text>
          </View>
          {products.map((p, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.tableCell}>{idx + 1}. {p.name}</Text>
              <Text style={styles.tableCell}>{p.quantity || p.qty}</Text>
              <Text style={styles.tableCell}>{p.price}</Text>
              <Text style={styles.tableCell}>{(p.price * 0.05).toFixed(3)}</Text>
              <Text style={styles.tableCell}>{(p.price * (p.quantity || p.qty)).toFixed(3)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.totalExclVat}</Text>
            <Text style={styles.summaryValue}>{total.toFixed(3)} ج.ع.</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.totalVat}</Text>
            <Text style={styles.summaryValue}>{totalVat} ج.ع.</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.totalInclVat}</Text>
            <Text style={styles.summaryValue}>{totalInclVat} ج.ع.</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.taxTable}>
            <View style={styles.taxTableRow}>
              <Text style={styles.taxTableCell}>{t.taxPercent}</Text>
              <Text style={styles.taxTableCell}>{t.taxableAmount}</Text>
              <Text style={styles.taxTableCell}>{t.taxAmount}</Text>
            </View>
            <View style={styles.taxTableRow}>
              <Text style={styles.taxTableCell}>0.00</Text>
              <Text style={styles.taxTableCell}>{total.toFixed(3)}</Text>
              <Text style={styles.taxTableCell}>0.000</Text>
            </View>
            <View style={styles.taxTableRow}>
              <Text style={styles.taxTableCell}>5.00</Text>
              <Text style={styles.taxTableCell}>{total.toFixed(3)}</Text>
              <Text style={styles.taxTableCell}>{totalVat}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.paymentDetailsTitle}>{t.paymentDetails}</Text>
          {/* Show payment mode label above Tender Cash */}
          <View style={styles.paymentDetailsRow}>
            <Text style={styles.paymentLabel}>{paymentModeLabel}</Text>
            <Text style={styles.paymentValue}>{amount ? amount.toFixed(3) : totalInclVat} ج.ع.</Text>
          </View>
          <View style={styles.paymentDetailsRow}>
            <Text style={styles.paymentLabel}>{t.tenderCash}</Text>
            <Text style={styles.paymentValue}>{totalInclVat} ج.ع.</Text>
          </View>
          <View style={styles.paymentDetailsRow}>
            <Text style={styles.paymentLabel}>{t.balanceCash}</Text>
            <Text style={styles.paymentValue}>{balanceCash} ج.ع.</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.totalQty}>{t.totalQty} {products.reduce((s, p) => s + (p.quantity || p.qty || 0), 0)}</Text>
          <View style={styles.divider} />
          <Text style={styles.footerText}>{t.thankYou}</Text>
          <Text style={styles.footerText}>{t.keepBillExchange}</Text>
          <Text style={styles.footerText}>{t.keepBillExchangeEn}</Text>
          <Text style={styles.footerText}>&lt;&lt; You Saved Amount RO: 0.000 &gt;&gt;</Text>
        </View>
        <Button
          title={t.newOrder}
          onPress={() => {
            // Clear cart logic (assuming you have a cart store or context)
            if (typeof route?.params?.clearCart === 'function') {
              route.params.clearCart();
            }
            navigation.navigate('POSProducts');
          }}
          style={{ marginTop: 24 }}
        />
        {/* Invoice is now auto-created if invoiceChecked is true */}
        <Button title={t.printFullReceipt} onPress={() => window.print && window.print()} style={{ marginTop: 12, marginBottom: 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  receiptBox: { backgroundColor: '#fff', borderRadius: 8, padding: 18, marginBottom: 18, elevation: 2 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  location: { fontSize: 16, textAlign: 'center', marginBottom: 2 },
  invoiceType: { fontSize: 16, textAlign: 'center', marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#ccc', marginVertical: 8 },
  cashier: { fontSize: 14, textAlign: 'left', marginBottom: 2 },
  invoiceNo: { fontSize: 14, textAlign: 'left', marginBottom: 2 },
  tableHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ccc', paddingBottom: 4, marginBottom: 2 },
  tableHeaderCell: { flex: 1, fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 2 },
  tableCell: { flex: 1, fontSize: 13, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  summaryLabel: { fontSize: 14, fontWeight: 'bold' },
  summaryValue: { fontSize: 14 },
  taxTable: { marginVertical: 8 },
  taxTableRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  taxTableCell: { flex: 1, fontSize: 13, textAlign: 'center' },
  paymentDetailsTitle: { fontSize: 15, fontWeight: 'bold', marginTop: 8, marginBottom: 2 },
  paymentDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  paymentLabel: { fontSize: 13 },
  paymentValue: { fontSize: 13 },
  totalQty: { fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginVertical: 6 },
  footerText: { fontSize: 13, textAlign: 'center', marginVertical: 1 },
});

export default POSReceiptScreen;
