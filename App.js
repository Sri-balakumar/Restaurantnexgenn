import { enableScreens } from 'react-native-screens';
enableScreens(true);

<<<<<<< HEAD
import React, { useState, useCallback } from 'react';
=======
import React, { useEffect } from 'react';
import { odooLogin } from '@api/services/odooAuth';
import { useAuthStore } from '@stores/auth';
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
import { LogBox, Text, TextInput } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import CustomToast from '@components/Toast/CustomToast';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
<<<<<<< HEAD
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import StackNavigator from '@navigation/StackNavigator';
import { Provider } from 'react-native-paper';
import * as Font from 'expo-font';

LogBox.ignoreAllLogs();

const defaultFontFamily = 'Urbanist-Medium';

function applyDefaultFont() {
  if (Text.defaultProps == null) Text.defaultProps = {};
  Text.defaultProps.style = { fontFamily: defaultFontFamily };
  if (TextInput.defaultProps == null) TextInput.defaultProps = {};
  TextInput.defaultProps.style = { fontFamily: defaultFontFamily };
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const loadFonts = useCallback(async () => {
    await Font.loadAsync({
      'Urbanist-Black': require('./assets/fonts/Urbanist/Urbanist-Black.ttf'),
      'Urbanist-Bold': require('./assets/fonts/Urbanist/Urbanist-Bold.ttf'),
      'Urbanist-ExtraBold': require('./assets/fonts/Urbanist/Urbanist-ExtraBold.ttf'),
      'Urbanist-ExtraLight': require('./assets/fonts/Urbanist/Urbanist-ExtraLight.ttf'),
      'Urbanist-Light': require('./assets/fonts/Urbanist/Urbanist-Light.ttf'),
      'Urbanist-Medium': require('./assets/fonts/Urbanist/Urbanist-Medium.ttf'),
      'Urbanist-Regular': require('./assets/fonts/Urbanist/Urbanist-Regular.ttf'),
      'Urbanist-SemiBold': require('./assets/fonts/Urbanist/Urbanist-SemiBold.ttf'),
      'Urbanist-Thin': require('./assets/fonts/Urbanist/Urbanist-Thin.ttf'),
    });
    applyDefaultFont();
    setFontsLoaded(true);
  }, []);

  React.useEffect(() => {
    loadFonts();
  }, [loadFonts]);

  if (!fontsLoaded) {
    return null;
  }
=======
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
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider>
<<<<<<< HEAD
        <NavigationContainer>
          <SafeAreaProvider>
            <BottomSheetModalProvider>
              <StackNavigator />
            </BottomSheetModalProvider>
            <Toast config={CustomToast} />
          </SafeAreaProvider>
        </NavigationContainer>
=======
      <NavigationContainer>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <StackNavigator />
          </BottomSheetModalProvider>
          <Toast config={CustomToast} />
        </SafeAreaProvider>
      </NavigationContainer>
>>>>>>> 2db01c18213b27cda51767e75dd63968b6634b1f
      </Provider>
    </GestureHandlerRootView>
  );
}
