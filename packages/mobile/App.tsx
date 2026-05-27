import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, I18nManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { LoginScreen } from './src/screens/LoginScreen';
import { registerPushToken, scheduleDailyNotification } from './src/services/notifications';

// Force RTL for Hebrew-first layout
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// ─── Inner component — consumes the AuthContext ───────────────────────────────
function AppContent() {
  const { isAuthed, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthed) {
      registerPushToken();
      scheduleDailyNotification();
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
          // onLogin is a no-op — the AuthContext's onAuthStateChange drives navigation
          <LoginScreen onLogin={() => {}} />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// ─── Root — AuthProvider must wrap everything ─────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
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
