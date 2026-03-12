import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import usePosLogo from '@hooks/usePosLogo';

const { width } = Dimensions.get('window');

const Header = () => {
  const logoSource = usePosLogo();

  if (!logoSource) return null;

  return (
    <View style={styles.container}>
      <Image
        source={logoSource}
        style={styles.backgroundImage}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  backgroundImage: {
    width: width * 0.42,
    aspectRatio: 3,
    resizeMode: 'contain',
  },
});

export default Header;
