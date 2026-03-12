import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONT_FAMILY } from '@constants/theme';
import { useAuthStore } from '@stores/auth';
import Constants from 'expo-constants'
import { getConfig } from '@utils/config';
import { useCurrencyStore } from '@stores/currency';
import * as deviceApi from '@api/services/deviceApi';

const SplashScreen = () => {
    const navigation = useNavigation();
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const setLoggedInUser = useAuthStore(state => state.login);
    const setCurrency = useCurrencyStore((state) => state.setCurrency); // Function to set currency in currency store

    useEffect(() => {
        // Get app name and config based on app name
        const appName = Constants.expoConfig.name;
        const config = getConfig(appName);

        // Set currency based on package name from config
        setCurrency(config.packageName);

        // Load custom fonts
        async function loadFonts() {
            await Font.loadAsync({
                'Urbanist-Black': require('@assets/fonts/Urbanist/Urbanist-Black.ttf'),
                'Urbanist-Bold': require('@assets/fonts/Urbanist/Urbanist-Bold.ttf'),
                'Urbanist-ExtraBold': require('@assets/fonts/Urbanist/Urbanist-ExtraBold.ttf'),
                'Urbanist-ExtraLight': require('@assets/fonts/Urbanist/Urbanist-ExtraLight.ttf'),
                'Urbanist-Light': require('@assets/fonts/Urbanist/Urbanist-Light.ttf'),
                'Urbanist-Medium': require('@assets/fonts/Urbanist/Urbanist-Medium.ttf'),
                'Urbanist-Regular': require('@assets/fonts/Urbanist/Urbanist-Regular.ttf'),
                'Urbanist-SemiBold': require('@assets/fonts/Urbanist/Urbanist-SemiBold.ttf'),
                'Urbanist-Thin': require('@assets/fonts/Urbanist/Urbanist-Thin.ttf'),
            });
            setFontsLoaded(true);
        }
        loadFonts();
    }, []);

    useEffect(() => {
        async function checkUserData() {
            // Step 1: Check if device config exists in AsyncStorage
            const pairs = await AsyncStorage.multiGet([
                'device_uuid',
                'device_server_url',
                'device_db_name',
                'device_registered',
            ]);
            const deviceUuid = pairs[0][1];
            const deviceServerUrl = pairs[1][1];
            const deviceDbName = pairs[2][1];
            const deviceRegistered = pairs[3][1];

            if (!deviceServerUrl || !deviceDbName) {
                // First launch — device not configured yet
                navigation.reset({ index: 0, routes: [{ name: 'DeviceSetup' }] });
                return;
            }

            // Step 2a: Module was skipped — go straight to login/app
            if (deviceRegistered === 'skipped') {
                const storedUserData = await AsyncStorage.getItem('userData');
                if (storedUserData) {
                    const userData = JSON.parse(storedUserData);
                    if (userData?.session_id) {
                        await AsyncStorage.setItem('odoo_session_id', userData.session_id);
                    }
                    setLoggedInUser(userData);
                    navigation.reset({ index: 0, routes: [{ name: 'AppNavigator' }] });
                } else {
                    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                }
                return;
            }

            // Step 2b: Try to ping Odoo to refresh last_login, but don't block the user
            // If device was previously registered (deviceRegistered === 'true'), always proceed
            // to Login/App regardless of network outcome.
            try {
                await deviceApi.initDevice({
                    baseUrl: deviceServerUrl,
                    databaseName: deviceDbName,
                    deviceId: deviceUuid,
                    deviceName: 'NexGen Restaurant App',
                });
            } catch (_) {
                // Network unreachable or module missing — proceed anyway if previously registered
            }

            if (deviceRegistered === 'true') {
                // Device was registered before — go straight to Login or App
                const storedUserData = await AsyncStorage.getItem('userData');
                if (storedUserData) {
                    const userData = JSON.parse(storedUserData);
                    if (userData?.session_id) {
                        await AsyncStorage.setItem('odoo_session_id', userData.session_id);
                    }
                    setLoggedInUser(userData);
                    navigation.reset({ index: 0, routes: [{ name: 'AppNavigator' }] });
                } else {
                    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                }
            } else {
                // Never completed registration — go to setup
                navigation.reset({ index: 0, routes: [{ name: 'DeviceSetup' }] });
            }
        }
        if (fontsLoaded) {
            checkUserData();
        }
    }, [fontsLoaded, navigation]);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Image
                source={require('@assets/images/Splash/splash.png')}
                style={styles.image}
                resizeMode="contain"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    versionText: {
        position: 'absolute',
        bottom: 30,
        fontSize: 16,
        marginTop: 20,
        color: COLORS.primaryThemeColor,
        fontFamily: FONT_FAMILY.urbanistBold,
    },
});

export default SplashScreen;
