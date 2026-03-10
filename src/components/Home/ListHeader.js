import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@components/Text';
import { COLORS, FONT_FAMILY } from '@constants/theme';

const ListHeader = ({ title, subtitle }) => {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.text}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primaryThemeColor || '#2e294e',
    marginBottom: 6,
  },
  text: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.urbanistExtraBold,
    color: COLORS.white,
  },
  inner: {
    flexDirection: 'column',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.urbanistLight,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
});

export default ListHeader;
