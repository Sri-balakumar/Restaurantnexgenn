// components/TabBarIcon.js
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, FONT_FAMILY } from '@constants/theme';

const ORANGE = '#F47B20';

const TabBarIcon = ({ iconComponent, label, focused }) => (
  <View style={styles.container}>
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <Image
        source={iconComponent}
        style={styles.icon}
        tintColor={focused ? ORANGE : 'rgba(255,255,255,0.6)'}
      />
    </View>
    <Text style={[styles.label, focused && styles.labelFocused]} numberOfLines={1}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    minWidth: 70,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 30,
    borderRadius: 15,
  },
  iconContainerFocused: {
    backgroundColor: 'rgba(244,123,32,0.15)',
    width: 52,
    height: 30,
    borderRadius: 15,
  },
  icon: {
    width: 22,
    height: 22,
  },
  label: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontFamily: FONT_FAMILY.urbanistMedium,
    marginTop: 3,
    letterSpacing: 0.3,
  },
  labelFocused: {
    color: ORANGE,
    fontFamily: FONT_FAMILY.urbanistBold,
  },
});

export default TabBarIcon;
