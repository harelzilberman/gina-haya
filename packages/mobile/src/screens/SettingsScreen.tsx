import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { signOut } from '../services/auth';
import { useAuth } from '../context/AuthContext';

export function SettingsScreen() {
  const { session } = useAuth();

  const handleLogout = async () => {
    Alert.alert('התנתקות', 'האם אתה בטוח?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'התנתק',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>הגדרות</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>חשבון</Text>
        <View style={styles.row}>
          <Text style={styles.label}>אימייל</Text>
          <Text style={styles.value}>{session?.user?.email ?? '—'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>אפליקציה</Text>
        <View style={styles.row}>
          <Text style={styles.label}>גרסה</Text>
          <Text style={styles.value}>1.0.2</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>התנתקות</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: theme.spacing.xl,
    writingDirection: 'rtl',
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'right',
    marginBottom: theme.spacing.sm,
    writingDirection: 'rtl',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    writingDirection: 'rtl',
  },
  value: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
  },
  logoutButton: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: '#c43a2a',
    padding: theme.spacing.md,
    borderRadius: theme.radius.full,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ffffff',
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
});
