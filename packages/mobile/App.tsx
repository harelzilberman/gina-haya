import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, I18nManager, Platform, StatusBar as RNStatusBar } from 'react-native';
import * as Linking from 'expo-linking';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { supabase } from './src/services/auth';

// Force RTL for Hebrew-first layout
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// ─── Inner component — consumes the AuthContext ───────────────────────────────
function AppContent() {
  const { isAuthed, isLoading } = useAuth();

  // Push notifications disabled for Expo Go — re-enable with a development build.

  useEffect(() => {
    if (Platform.OS === 'android') {
      RNStatusBar.setTranslucent(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthed) {
      // notifications disabled for now
    }
  }, [isAuthed]);


  // Show a splash/loading screen while restoring the session from SecureStore
  if (isLoading) {
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
        {isAuthed ? (
          <AppNavigator />
        ) : (
          <LoginScreen onLogin={() => {}} />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// ─── Root — AuthProvider must wrap everything ─────────────────────────────────
export default function App() {
  // Handle deep link when app is already open
  useEffect(() => {
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      console.log('🔴 Deep link received:', url);
      if (!url.includes('ginahaya://auth') && !url.includes('/--/auth')) return;

      const parts = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
      const params = Object.fromEntries(new URLSearchParams(parts));

      if (params.access_token && params.refresh_token) {
        console.log('🔴 Setting session from deep link');
        await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
      }
    });

    // Handle deep link when app was closed and opened via deep link
    Linking.getInitialURL().then(async (url) => {
      if (!url) return;
      console.log('🔴 Initial URL:', url);
      if (!url.includes('ginahaya://auth') && !url.includes('/--/auth')) return;

      const parts = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
      const params = Object.fromEntries(new URLSearchParams(parts));

      if (params.access_token && params.refresh_token) {
        console.log('🔴 Setting session from initial URL');
        await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GestureHandlerRootView>
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
