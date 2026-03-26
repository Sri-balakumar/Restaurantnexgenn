import React from 'react';
import { View } from 'react-native';
import { SafeAreaView as RNSSafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@constants/theme';
import { StatusBar } from 'expo-status-bar';

const SafeAreaView = ({ children, backgroundColor = COLORS.primaryThemeColor, edges }) => {

  return (
    <RNSSafeAreaView style={{ flex: 1, backgroundColor: backgroundColor }} edges={edges || ['top', 'left', 'right']}>
      <StatusBar backgroundColor={backgroundColor}  style='auto' />
      {children}
    </RNSSafeAreaView>
  );
};

export default SafeAreaView;
