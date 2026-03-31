import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Switch, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { getCurrentUserEmail, logout } from '../services/auth';
import { scheduleDailyNotification } from '../services/notifications';

const NOTIF_HOUR_KEY = 'gina_haya_notif_hour';

export function SettingsScreen() {
  const [email,         setEmail]         = useState<string | null>(null);
  const [notifEnabled,  setNotifEnabled]  = useState(false);
  const [notifHour,     setNotifHour]     = useState(7);
  const [language,      setLanguage]      = useState<'he' | 'en'>('he');

  useEffect(() => {
    getCurrentUserEmail().then(setEmail);
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotifEnabled(status === 'granted');
    });
    SecureStore.getItemAsync(NOTIF_HOUR_KEY).then(val => {
      if (val) setNotifHour(parseInt(val, 10));
    });
  }, []);

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotifEnabled(true);
        await scheduleDailyNotification();
      }
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setNotifEnabled(false);
    }
  };

  const changeNotifHour = async (delta: number) => {
    const next = Math.min(23, Math.max(0, notifHour + delta));
    setNotifHour(next);
    await SecureStore.setItemAsync(NOTIF_HOUR_KEY, String(next));
    if (notifEnabled) {
      await scheduleDailyNotification();
    }
  };

  const handleLogout = async () => {
    await logout();
    // App.tsx re-checks auth state on next render — restart navigation to trigger login
    // In a real app this would emit an event; for the scaffold, clearing state is enough
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>הגדרות</Text>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>חשבון</Text>
          <View style={styles.row}>
            <Text style={styles.label}>אימייל</Text>
            <Text style={styles.value}>{email ?? '—'}</Text>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>התראות</Text>
          <View style={styles.row}>
            <Text style={styles.label}>התראה יומית</Text>
            <Switch
              value={notifEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: 'rgba(200,168,75,0.2)', true: 'rgba(200,168,75,0.6)' }}
              thumbColor={notifEnabled ? '#c8a84b' : '#555'}
            />
          </View>
          {notifEnabled && (
            <View style={styles.row}>
              <Text style={styles.label}>שעת התראה</Text>
              <View style={styles.hourPicker}>
                <TouchableOpacity onPress={() => changeNotifHour(-1)} style={styles.hourBtn}>
                  <Text style={styles.hourBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.hourValue}>
                  {String(notifHour).padStart(2, '0')}:00
                </Text>
                <TouchableOpacity onPress={() => changeNotifHour(1)} style={styles.hourBtn}>
                  <Text style={styles.hourBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>שפה</Text>
          <View style={styles.toggleRow}>
            {(['he', 'en'] as const).map(lang => (
              <TouchableOpacity
                key={lang}
                style={[styles.langBtn, language === lang && styles.langBtnActive]}
                onPress={() => setLanguage(lang)}
              >
                <Text style={[styles.langBtnText, language === lang && styles.langBtnTextActive]}>
                  {lang === 'he' ? 'עברית' : 'English'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>התנתקות</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a3a2a' },
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#c8a84b',
    textAlign: 'right',
    marginBottom: 4,
  },
  section: {
    backgroundColor: 'rgba(28,58,30,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(200,168,75,0.15)',
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(200,168,75,0.65)',
    textAlign: 'right',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 15,
    color: '#EDE0C4',
  },
  value: {
    fontSize: 14,
    color: 'rgba(237,224,196,0.55)',
  },
  hourPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hourBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(200,168,75,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourBtnText: { fontSize: 18, color: '#c8a84b', fontWeight: '700' },
  hourValue: { fontSize: 16, color: '#EDE0C4', fontWeight: '600', minWidth: 52, textAlign: 'center' },
  toggleRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(200,168,75,0.25)',
    alignItems: 'center',
  },
  langBtnActive: {
    backgroundColor: 'rgba(200,168,75,0.2)',
    borderColor: '#c8a84b',
  },
  langBtnText: { fontSize: 14, color: 'rgba(237,224,196,0.55)' },
  langBtnTextActive: { color: '#c8a84b', fontWeight: '600' },
  logoutBtn: {
    backgroundColor: 'rgba(192,57,43,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.35)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: { fontSize: 16, color: '#E06060', fontWeight: '600' },
});
