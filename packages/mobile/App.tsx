import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, I18nManager, Platform, StatusBar as RNStatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { supabase } from './src/services/auth';

// Required for WebBrowser.openAuthSessionAsync to work on Android
WebBrowser.maybeCompleteAuthSession();

// Force RTL for Hebrew-first layout
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

function AppContent() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'android') {
      RNStatusBar.setTranslucent(false);
    }
  }, []);

  // Handle deep link when app is in background/foreground
  // This catches the OAuth callback when Chrome Custom Tabs redirects back
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      console.log('🔴 [DEEPLINK] Received URL:', url);
      if (url.includes('auth-callback')) {
        console.log('🔴 [DEEPLINK] Processing auth callback...');
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(url);
          if (error) console.log('🔴 [DEEPLINK] Exchange error:', error.message);
          else console.log('🔴 [DEEPLINK] ✅ Session established from deep link');
        } catch (e) {
          console.log('🔴 [DEEPLINK] Exception:', e);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#c4860a" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <AppNavigator /> : <LoginScreen onLogin={() => {}} />}
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
    backgroundColor: '#060e08',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
