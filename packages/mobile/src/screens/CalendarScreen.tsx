import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { theme } from '../theme';
import { supabase } from '../services/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface CalendarData {
  date: string;
  dayType: string;
  moonSign: string;
  moonPhase: string;
  plantingScore: number;
  description?: string;
  recommendations?: string[];
}

const DAY_TYPE_COLORS: Record<string, string> = {
  fruit: '#c4860a',
  flower: '#9c4a8a',
  leaf: '#4a9c68',
  root: '#8b5a2b',
  unfavorable: '#555',
};

const DAY_TYPE_ICONS: Record<string, string> = {
  fruit: '🍎',
  flower: '🌸',
  leaf: '🌿',
  root: '🥕',
  unfavorable: '⚠️',
};

export function CalendarScreen() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendar();
  }, []);

  const fetchCalendar = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${API_URL}/api/calendar/today`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.log('Calendar fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const dayColor = DAY_TYPE_COLORS[data?.dayType ?? ''] ?? theme.colors.accent;
  const dayIcon = DAY_TYPE_ICONS[data?.dayType ?? ''] ?? '🌱';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>לוח ביודינמי</Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('he-IL', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
        </Text>

        {/* Main Day Card */}
        <View style={[styles.mainCard, { borderColor: dayColor }]}>
          <Text style={styles.dayIcon}>{dayIcon}</Text>
          <Text style={[styles.dayType, { color: dayColor }]}>
            {data?.dayType ?? '—'}
          </Text>
          <Text style={styles.dayDesc}>
            {data?.description ?? 'יום ' + (data?.dayType ?? '')}
          </Text>
        </View>

        {/* Info Grid */}
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridIcon}>🌙</Text>
            <Text style={styles.gridValue}>{data?.moonSign ?? '—'}</Text>
            <Text style={styles.gridLabel}>מזל הירח</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridIcon}>🌕</Text>
            <Text style={styles.gridValue}>{data?.moonPhase ?? '—'}</Text>
            <Text style={styles.gridLabel}>שלב הירח</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridIcon}>⭐</Text>
            <Text style={styles.gridValue}>{data?.plantingScore ?? '—'}/10</Text>
            <Text style={styles.gridLabel}>ציון נטיעה</Text>
          </View>
        </View>

        {/* Recommendations */}
        {data?.recommendations && data.recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>המלצות להיום</Text>
            {data.recommendations.map((rec, i) => (
              <View key={i} style={styles.recRow}>
                <Text style={styles.recText}>{rec}</Text>
                <Text style={styles.recBullet}>✦</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: theme.spacing.xs,
  },
  date: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: theme.spacing.lg,
  },
  mainCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  dayIcon: { fontSize: 48, marginBottom: theme.spacing.sm },
  dayType: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
    writingDirection: 'rtl',
  },
  dayDesc: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  grid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  gridItem: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  gridIcon: { fontSize: 24, marginBottom: 4 },
  gridValue: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gridLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    marginTop: 2,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  section: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.accent,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: theme.spacing.md,
    writingDirection: 'rtl',
  },
  recRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  recText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    textAlign: 'right',
    flex: 1,
    writingDirection: 'rtl',
  },
  recBullet: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
  },
});
