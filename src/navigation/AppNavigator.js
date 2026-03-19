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
<<<<<<< HEAD
import { useTranslation } from '@hooks';
=======
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f

const Tab = createBottomTabNavigator();
const ORANGE = '#F47B20';

const DummyScreen = () => null;

const AppNavigator = () => {
  const logoutStore = useAuthStore((state) => state.logout);
<<<<<<< HEAD
  const { t } = useTranslation();

  const handleLogout = (navigation) => {
    Alert.alert(t.logoutConfirmTitle, t.logoutConfirmMessage, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.logout,
=======

  const handleLogout = (navigation) => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
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
      borderTopRightRadius: 20,
      borderTopLeftRadius: 20,
      elevation: 8,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: -3 },
      height: 68,
      backgroundColor: '#2e294e',
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
<<<<<<< HEAD
              label={t.home}
=======
              label="Home"
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
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
<<<<<<< HEAD
              label={t.profile}
=======
              label="Profile"
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
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
<<<<<<< HEAD
              <Text style={{ color: focused ? ORANGE : 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: FONT_FAMILY.urbanistMedium, marginTop: 3, letterSpacing: 0.3 }} numberOfLines={1}>{t.logout}</Text>
=======
              <Text style={{ color: focused ? ORANGE : 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: FONT_FAMILY.urbanistMedium, marginTop: 3, letterSpacing: 0.3 }} numberOfLines={1}>Logout</Text>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
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
