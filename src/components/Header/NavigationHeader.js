import React, { useRef } from 'react';
import { View, StyleSheet, Pressable, Animated, Image, TouchableOpacity } from 'react-native';
import Text from '@components/Text';
import { COLORS, FONT_FAMILY } from '@constants/theme';
import { AntDesign, Feather } from '@expo/vector-icons';

const NavigationHeader = ({
    title,
    onBackPress,
    color = COLORS.white,
    backgroundColor = COLORS.primaryThemeColor,
    logo = true,
    iconOneName,
    iconOnePress,
    iconTwoName,
    iconTwoPress,
    iconThreeName,
    iconThreePress,
    refreshIcon = false,
    refreshPress = () => { },
    checkIcon = false,
    checkPress = () => { }
}) => {

    const goBackScale = useRef(new Animated.Value(1)).current;

    // Use the restaurant logo2.png for the header (always)
    const logoSource = require('@assets/images/logo2.png');

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <Pressable
                onPress={() => {
                    // small press animation then call back
                    try {
                        if (onBackPress) {
                            // animate then navigate
                            const a = goBackScale;
                            Animated.sequence([
                                Animated.timing(a, { toValue: 0.92, duration: 80, useNativeDriver: true }),
                                Animated.timing(a, { toValue: 1, duration: 120, useNativeDriver: true }),
                            ]).start(() => onBackPress());
                        }
                    } catch (e) {
                        if (onBackPress) onBackPress();
                    }
                }}
                onPressIn={() => Animated.timing(goBackScale, { toValue: 0.92, duration: 80, useNativeDriver: true }).start()}
                onPressOut={() => Animated.timing(goBackScale, { toValue: 1, duration: 120, useNativeDriver: true }).start()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.goBackContainer}
            >
                <Animated.View style={{ transform: [{ scale: goBackScale }] }}>
                    <AntDesign name="left" size={22} color={color} />
                </Animated.View>
            </Pressable>
            <Text style={[styles.title, { color }]}>{title}</Text>
            {logo && <Image source={logoSource} style={styles.logoImage} />}
            {iconOneName &&
                <TouchableOpacity activeOpacity={0.8} onPress={iconOnePress}>
                    <AntDesign name={iconOneName} size={25} color={color} />
                </TouchableOpacity>
            }
            <View style={{ width: 15 }} />
            {iconTwoName &&
                <TouchableOpacity activeOpacity={0.8} onPress={iconTwoPress}>
                    <AntDesign name={iconTwoName} size={25} color={color} />
                </TouchableOpacity>
            }
            <View style={{ width: 5 }} />

            {iconThreeName &&
                <TouchableOpacity activeOpacity={0.8} onPress={iconThreePress}>
                    <AntDesign name={iconThreeName} size={25} color={color} />
                </TouchableOpacity>
            }
            {checkIcon &&
                <TouchableOpacity activeOpacity={0.8} onPress={checkPress}>
                    <Feather name="check-circle" size={30} color={COLORS.orange} />
                </TouchableOpacity>
            }
            {refreshIcon &&
                <TouchableOpacity activeOpacity={0.8} onPress={refreshPress}>
                    <Image source={require('@assets/images/header/refresh_button.png')} style={styles.refreshImage} />
                </TouchableOpacity>
            }
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 15,
        // reserve space on the right so an absolutely positioned large logo
        // doesn't overlap the header content (title / icons)
        paddingRight: 420,
    },
    goBackContainer: {
        marginRight: 15,
    },
    title: {
        fontSize: 18,
        fontFamily: FONT_FAMILY.urbanistBold,
        flex: 1,
        paddingLeft: 10,
    },
    logoImage: {
        // absolutely position the logo so increasing its visual size
        // won't change header layout or push content down
        position: 'absolute',
        right: 12,
        top: -80,
        width: 320,
        height: 320,
        resizeMode: 'contain',
        zIndex: 999,
    },
    refreshImage: {
        width: 30,
        height: 30,
        resizeMode: 'contain',
        tintColor: COLORS.white,
    },
});

export default NavigationHeader;
