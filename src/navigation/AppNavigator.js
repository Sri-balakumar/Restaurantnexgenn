// navigation/TabNavigator.js
import React from 'react';
import { View, Text, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { TabBarIcon } from '@components/TabBar';
import { HomeScreen, ProfileScreen } from '@screens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@stores/auth';
import { clearProductCache } from '@api/services/generalApi';
import { FONT_FAMILY } from '@constants/theme';
import { useTranslation } from '@hooks';

const Tab = createBottomTabNavigator();
const ORANGE = '#F47B20';

const DummyScreen = () => null;

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
          await AsyncStorage.multiRemove(['userData', 'odoo_session_id']);
          logoutStore();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const tabBarOptions = {
    tabBarShowLabel: false,
    tabBarHideOnKeyboard: true,
    headerShown: false,
    tabBarStyle: {
      position: "absolute",
      bottom: 5,
      right: 10,
      left: 10,
      borderRadius: 20,
      elevation: 8,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: -3 },
      height: 68,
      backgroundColor: '#2e294e',
      borderTopWidth: 0,
      overflow: 'hidden',
    }
  };

  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) =>
            <TabBarIcon
              focused={focused}
              iconComponent={require('@assets/icons/bottom_tabs/home.png')}
              label={t.home}
            />
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) =>
            <TabBarIcon
              focused={focused}
              iconComponent={require('@assets/icons/bottom_tabs/profile.png')}
              label={t.profile}
            />
        }}
      />
      <Tab.Screen
        name="LogoutTab"
        component={DummyScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 4, minWidth: 70 }}>
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 48, height: 30, borderRadius: 15, backgroundColor: focused ? 'rgba(244,123,32,0.15)' : 'transparent' }}>
                <MaterialIcons name="logout" size={22} color={focused ? ORANGE : 'rgba(255,255,255,0.6)'} />
              </View>
              <Text style={{ color: focused ? ORANGE : 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: FONT_FAMILY.urbanistMedium, marginTop: 3, letterSpacing: 0.3 }} numberOfLines={1}>{t.logout}</Text>
            </View>
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            handleLogout(navigation);
          },
        })}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator;
