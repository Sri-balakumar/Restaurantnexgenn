import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { MaterialIcons } from '@expo/vector-icons';
import Text from '@components/Text';
import { FONT_FAMILY } from '@constants/theme';
import useNetworkErrorStore from './networkErrorStore';

const NetworkErrorModal = () => {
  const { visible, title, message, onRetry, onCancel, hide } = useNetworkErrorStore();

  const handleRetry = () => {
    const cb = onRetry;
    hide();
    if (typeof cb === 'function') cb();
  };

  const handleCancel = () => {
    const cb = onCancel;
    hide();
    if (typeof cb === 'function') cb();
  };

  return (
    <Modal
      isVisible={visible}
      backdropOpacity={0.6}
      animationIn="fadeIn"
      animationOut="fadeOut"
      onBackdropPress={handleCancel}
      onBackButtonPress={handleCancel}
    >
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="wifi-off" size={40} color="#F47B20" />
        </View>
        <Text style={styles.title}>{title || 'Connection problem'}</Text>
        <Text style={styles.message}>
          {message || 'Cannot reach server. Please check your internet connection or router.'}
        </Text>
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.retryBtn]} onPress={handleRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 22,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.urbanistBold,
    color: '#2E294E',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.urbanistRegular,
    color: '#555',
    textAlign: 'center',
    marginBottom: 18,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#EEE',
  },
  retryBtn: {
    backgroundColor: '#2E294E',
  },
  cancelText: {
    color: '#2E294E',
    fontFamily: FONT_FAMILY.urbanistBold,
  },
  retryText: {
    color: 'white',
    fontFamily: FONT_FAMILY.urbanistBold,
  },
});

export default NetworkErrorModal;
