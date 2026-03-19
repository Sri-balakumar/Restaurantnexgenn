import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from '@components/containers';
import { NavigationHeader } from '@components/Header';
import { Button } from '@components/common/Button';
import { useTranslation } from '@hooks';

const SalesOrderChoice = ({ navigation }) => {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader title={t.salesOrder} onBackPress={() => navigation.goBack()} />
      <View style={styles.content}>
        <Text style={styles.title}>{t.createSalesOrder}</Text>
        {/* Removed subtitle as requested */}

        <View style={styles.buttons}>
          <TouchableOpacity style={[styles.option, styles.pos]} onPress={() => navigation.navigate('POSRegister')}>

            <Text style={styles.optionTitle}>{t.pos}</Text>
            <Text style={styles.optionSub}>{t.posOrderSubtitle}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.option, styles.placeOrder]} onPress={() => navigation.navigate('CustomerScreen')}>
            <Text style={styles.optionTitle}>{t.placeOrder}</Text>
            <Text style={styles.optionSub}>{t.placeOrderSubtitle}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 28 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 18, color: '#fff' },
  subtitle: { color: '#666', marginTop: 6 },
  buttons: { marginTop: 28 },
  option: { padding: 24, borderRadius: 12, marginBottom: 18, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fafafa' },
  pos: { backgroundColor: '#fafafa' },
  placeOrder: { backgroundColor: '#fafafa' },
  optionTitle: { fontSize: 22, fontWeight: '800' },
  optionSub: { color: '#666', marginTop: 8, fontSize: 16 },
});

export default SalesOrderChoice;
