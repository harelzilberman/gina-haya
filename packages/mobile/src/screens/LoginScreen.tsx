import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Alert, I18nManager
} from 'react-native';
import { useState } from 'react';
import { theme } from '../theme';
import { signInWithGoogle } from '../services/auth';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      Alert.alert('שגיאה בכניסה', err.message ?? 'נסה שנית מאוחר יותר');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/chupchu_web_in_hole.png')}
        style={styles.image}
        resizeMode="cover"
      />
      <Text style={styles.title}>שלום, אני צ'ופצ'ו</Text>
      <Text style={styles.subtitle}>המומחה הביודינמי שלך – גינה חיה</Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading
          ? <ActivityIndicator color={theme.colors.background} />
          : <Text style={styles.buttonText}>G  כניסה עם Google</Text>
        }
      </TouchableOpacity>

      {loading && (
        <Text style={styles.hint}>
          לאחר הכניסה ב-Google,{'\n'}חזור לאפליקציה
        </Text>
      )}

      <Text style={styles.legal}>
        בכניסה אתה מסכים לתנאי השימוש של גינה חיה
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  image: {
    width: '100%',
    height: 280,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  button: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.full,
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  hint: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    writingDirection: 'rtl',
  },
  legal: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
