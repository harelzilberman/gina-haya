import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login } from '../services/auth';

interface Props {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('נא למלא אימייל וסיסמה');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      onLogin();
    } catch (err: any) {
      setError(err.message ?? 'שגיאה בכניסה. בדוק פרטים ונסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Logo */}
        <Text style={styles.logo}>🌱</Text>
        <Text style={styles.title}>גינה חיה</Text>
        <Text style={styles.subtitle}>Gina Haya</Text>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="אימייל"
            placeholderTextColor="rgba(237,224,196,0.35)"
            keyboardType="email-address"
            autoCapitalize="none"
            textAlign="right"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="סיסמה"
            placeholderTextColor="rgba(237,224,196,0.35)"
            secureTextEntry
            textAlign="right"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#1a3a2a" />
              : <Text style={styles.buttonText}>כניסה</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1a3a2a',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  logo: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#c8a84b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(200,168,75,0.6)',
    fontStyle: 'italic',
    marginBottom: 40,
  },
  form: {
    width: '100%',
    gap: 12,
  },
  input: {
    backgroundColor: 'rgba(28,58,30,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(200,168,75,0.25)',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#EDE0C4',
  },
  error: {
    color: '#E06060',
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#c8a84b',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#1a3a2a',
    fontSize: 16,
    fontWeight: '700',
  },
});
