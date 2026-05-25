import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, I18nManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from './src/navigation/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { isLoggedIn } from './src/services/auth';
import { registerPushToken, scheduleDailyNotification } from './src/services/notifications';

// Force RTL for Hebrew-first layout
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    isLoggedIn().then(setAuthed);
  }, []);

  useEffect(() => {
    if (authed) {
      registerPushToken();
      scheduleDailyNotification();
    }
  }, [authed]);

  if (authed === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#c4860a" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        {authed ? (
          <AppNavigator />
        ) : (
          <LoginScreen onLogin={() => setAuthed(true)} />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#1a1a0e',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
