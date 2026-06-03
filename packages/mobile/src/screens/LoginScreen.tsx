import { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithGoogle } from '../services/auth';
import { statusCodes } from '@react-native-google-signin/google-signin';

interface Props {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      onLogin();  // only reached if no error thrown
    } catch (err: any) {
      if (err.code !== statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('שגיאה בכניסה', err.message ?? 'נסה שוב מאוחר יותר');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Chupchu character */}
        <Image
          source={{ uri: 'https://gina-haya.vercel.app/chupchu_final.png' }}
          style={styles.chupchu}
          resizeMode="contain"
        />

        {/* Welcome text */}
        <Text style={styles.welcome}>שלום, אני צ'ופצ'ו</Text>
        <Text style={styles.subtitle}>המומחה הביודינמי שלך — גינה חיה</Text>

        {/* Google sign-in */}
        <TouchableOpacity
          style={[styles.googleBtn, loading && styles.btnDisabled]}
          onPress={handleGoogle}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#1a1a0e" />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>כניסה עם Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          בכניסה אתה מסכים לתנאי השימוש של גינה חיה
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1a1a0e',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  chupchu: {
    width: 160,
    height: 160,
    marginBottom: 8,
  },
  welcome: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f5f0e8',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(245,240,232,0.55)',
    textAlign: 'center',
    marginBottom: 24,
  },
  googleBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#f5f0e8',
    borderRadius: 14,
    height: 56,
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  btnDisabled: { opacity: 0.6 },
  googleIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#c4860a',
  },
  googleText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a0e',
  },
  disclaimer: {
    fontSize: 11,
    color: 'rgba(245,240,232,0.3)',
    textAlign: 'center',
    marginTop: 8,
  },
});
