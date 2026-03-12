import { enableScreens } from 'react-native-screens';
enableScreens(true);

import React, { useEffect } from 'react';
import { odooLogin } from '@api/services/odooAuth';
import { useAuthStore } from '@stores/auth';
import { LogBox, Text, TextInput } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import CustomToast from '@components/Toast/CustomToast';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Import GestureHandlerRootView
import StackNavigator from '@navigation/StackNavigator';
import { Provider } from 'react-native-paper';

// Set Urbanist as the default font for ALL Text and TextInput across the app
const defaultFontFamily = 'Urbanist-Medium';
const oldTextRender = Text.render;
Text.render = function (...args) {
  const origin = oldTextRender.call(this, ...args);
  return React.cloneElement(origin, {
    style: [{ fontFamily: defaultFontFamily }, origin.props.style],
  });
};
if (TextInput.defaultProps == null) TextInput.defaultProps = {};
TextInput.defaultProps.style = [{ fontFamily: defaultFontFamily }, TextInput.defaultProps.style];

export default function App() {
  const login = useAuthStore((state) => state.login);
  // No auto-login: show LoginScreen on app load

  LogBox.ignoreLogs(["new NativeEventEmitter"]);
  LogBox.ignoreAllLogs();

  LogBox.ignoreLogs([
    "Non-serializable values were found in the navigation state",
  ]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider>
      <NavigationContainer>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <StackNavigator />
          </BottomSheetModalProvider>
          <Toast config={CustomToast} />
        </SafeAreaProvider>
      </NavigationContainer>
      </Provider>
    </GestureHandlerRootView>
  );
}
