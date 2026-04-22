// navigation/TabNavigator.js
import React, { useRef } from 'react';
import { View, Text, Alert, TouchableOpacity, Image, StyleSheet, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { HomeScreen, ProfileScreen } from '@screens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@stores/auth';
import { clearProductCache } from '@api/services/generalApi';
import { clearPosConfigCache } from '@api/services/kotService';
import { FONT_FAMILY } from '@constants/theme';
import { useTranslation } from '@hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const ORANGE = '#F47B20';

const DummyScreen = () => null;

const AnimatedTabButton = ({ onPress, isFocused, children }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.85, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }).start();
  };
  return (
    <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.tabItem} activeOpacity={1}>
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

const CustomTabBar = ({ state, descriptors, navigation, t, handleLogout }) => {
  const insets = useSafeAreaInsets();
  const tabs = [
    { name: 'Home', icon: require('@assets/icons/bottom_tabs/home.png'), label: t.home, type: 'image' },
    { name: 'Profile', icon: require('@assets/icons/bottom_tabs/profile.png'), label: t.profile, type: 'image' },
    { name: 'LogoutTab', icon: 'logout', label: t.logout, type: 'material' },
  ];

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: insets.bottom }]}>
      <View style={styles.tabBarContainer}>
        <View style={styles.tabRow}>
        {tabs.map((tab, index) => {
          const isFocused = state.index === index;
          const onPress = () => {
            if (tab.name === 'LogoutTab') {
              handleLogout(navigation);
              return;
            }
            const event = navigation.emit({ type: 'tabPress', target: state.routes[index].key, canPreventDefault: true });
            if (!event.defaultPrevented) {
              navigation.navigate(tab.name);
            }
          };

          return (
            <AnimatedTabButton key={tab.name} onPress={onPress} isFocused={isFocused}>
              <View style={[styles.iconWrap, isFocused && styles.iconWrapFocused]}>
                {tab.type === 'image' ? (
                  <Image source={tab.icon} style={styles.icon} tintColor={isFocused ? '#fff' : 'rgba(255,255,255,0.6)'} />
                ) : (
                  <MaterialIcons name={tab.icon} size={22} color={isFocused ? '#fff' : 'rgba(255,255,255,0.6)'} />
                )}
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelFocused]} numberOfLines={1}>{tab.label}</Text>
            </AnimatedTabButton>
          );
        })}
        </View>
      </View>
    </View>
  );
};

const AppNavigator = () => {
  const logoutStore = useAuthStore((state) => state.logout);
  const { t } = useTranslation();

  const handleLogout = (navigation) => {
    Alert.alert(t.logoutConfirmTitle, t.logoutConfirmMessage, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.logout,
        style: 'destructive',
        onPress: async () => {
          clearProductCache();
          clearPosConfigCache();
          await AsyncStorage.multiRemove(['userData', 'odoo_session_id']);
          logoutStore();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
      tabBar={(props) => <CustomTabBar {...props} t={t} handleLogout={handleLogout} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="LogoutTab" component={DummyScreen} listeners={({ navigation }) => ({ tabPress: (e) => { e.preventDefault(); handleLogout(navigation); } })} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarOuter: {
    backgroundColor: '#ffffff',
  },
  tabBarContainer: {
    backgroundColor: ORANGE,
    paddingTop: 6,
    paddingBottom: 6,
  },
  poweredText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontFamily: FONT_FAMILY.urbanistRegular,
    marginBottom: 4,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 28,
    borderRadius: 14,
  },
  iconWrapFocused: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 14,
  },
  icon: {
    width: 22,
    height: 22,
  },
  tabLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontFamily: FONT_FAMILY.urbanistMedium,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  tabLabelFocused: {
    color: '#fff',
    fontFamily: FONT_FAMILY.urbanistBold,
  },
});

export default AppNavigator;
