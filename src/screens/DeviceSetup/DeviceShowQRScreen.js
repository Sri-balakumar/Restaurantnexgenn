// src/screens/DeviceSetup/DeviceShowQRScreen.js
// Displays a QR code containing the device's ID + model name.
// Admin scans this QR from the Odoo Device Registry form (using laptop webcam).
// No network calls here — pure visual data transfer from tablet to laptop.

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import Text from '@components/Text';
import { FONT_FAMILY } from '@constants/theme';

const PURPLE = '#875a7b';

const DeviceShowQRScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { deviceUUID = '', deviceModel = 'Unknown Device' } = route.params || {};

  // QR payload — Odoo parses this to fill Device ID + Device Name fields
  const qrValue = JSON.stringify({ device_id: deviceUUID, device_name: deviceModel });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Show QR to Admin</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Instruction */}
        <Text style={styles.instruction}>
          Ask your admin to open{'\n'}
          <Text style={styles.bold}>Device Registry → New Device</Text>
          {'\n'}and click <Text style={styles.bold}>"Scan Device QR"</Text> to scan the code below with the laptop webcam.
        </Text>

        {/* QR Code */}
        <View style={styles.qrWrapper}>
          <QRCode
            value={qrValue}
            size={220}
            color="#1a1a2e"
            backgroundColor="#ffffff"
          />
        </View>

        {/* Device info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Device Model</Text>
            <Text style={styles.infoValue}>{deviceModel}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Device ID</Text>
            <Text style={styles.infoValue} selectable numberOfLines={2}>
              {deviceUUID}
            </Text>
          </View>
        </View>

        <Text style={styles.hint}>
          After the admin saves the record, go back and tap{'\n'}
          <Text style={styles.bold}>"Configure Device"</Text> again.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f0f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: PURPLE,
  },
  backBtn: {
    width: 70,
  },
  backText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: FONT_FAMILY.urbanistBold,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontFamily: FONT_FAMILY.urbanistBold,
  },
  scroll: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  instruction: {
    fontSize: 15,
    color: '#444',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  bold: {
    fontFamily: FONT_FAMILY.urbanistBold,
    color: PURPLE,
  },
  qrWrapper: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 28,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 4,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: '#888',
    fontFamily: FONT_FAMILY.urbanistBold,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 13,
    color: '#222',
    fontFamily: FONT_FAMILY.urbanistBold,
    textAlign: 'right',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0e8f4',
  },
  hint: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default DeviceShowQRScreen;
