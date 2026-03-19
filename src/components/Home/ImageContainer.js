import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { FONT_FAMILY } from '@constants/theme';
import Text from '@components/Text';

const { width } = Dimensions.get('window');

const ImageContainer = ({ source, onPress, title }) => (
  <TouchableOpacity onPress={onPress} style={styles.imageContainer} activeOpacity={0.75}>
    <View style={styles.imageWrapper}>
      <Image source={source} style={styles.image} />
    </View>
    <View style={styles.textContainer}>
      <Text style={styles.buttonText}>{title}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  imageContainer: {
    width: width * 0.3,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 4,
    minHeight: 140,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  imageWrapper: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    overflow: 'hidden',
  },
  image: {
    width: 68,
    height: 68,
    resizeMode: 'contain',
    borderRadius: 34,
  },
  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  buttonText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#2E294E',
    fontFamily: FONT_FAMILY.urbanistBold,
    lineHeight: 16,
  },
});

export default ImageContainer;
