import './src/cryptoPolyfill';
import 'react-native-gesture-handler';
import { useEffect } from 'react';
import {
  View, ActivityIndicator, StyleSheet,
  I18nManager, Platform, StatusBar as RNStatusBar
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './src/services/supabase';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { theme } from './src/theme';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

function AppContent() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'android') {
      RNStatusBar.setTranslucent(false);
      RNStatusBar.setBackgroundColor(theme.colors.background);
    }
  }, []);

  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      if (!url.includes('auth-callback') && !url.includes('ginahaya://')) return;

      WebBrowser.dismissBrowser();
      const parts = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
      const params = Object.fromEntries(new URLSearchParams(parts));

      if (params.access_token && params.refresh_token) {
        const sessionData = {
          access_token: params.access_token,
          refresh_token: params.refresh_token,
          expires_at: parseInt(params.expires_at),
          expires_in: parseInt(params.expires_in),
          token_type: 'bearer',
        };
        const storageKey = 'sb-qlcaweebrouzfwkumffc-auth-token';
        await SecureStore.setItemAsync(storageKey, JSON.stringify({
          currentSession: sessionData,
          expiresAt: parseInt(params.expires_at),
        }));
        await supabase.auth.refreshSession({ refresh_token: params.refresh_token });
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then(url => { if (url) handleUrl({ url }); });
    return () => sub.remove();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      {session ? <AppNavigator /> : <LoginScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
