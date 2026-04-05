import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator,
  StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BiodynamicDay } from '@gina-haya/shared';
import { fetchTodayCalendar } from '../services/calendar';
import { DayCard } from '../components/DayCard';

export function CalendarScreen() {
  const [day,       setDay]       = useState<BiodynamicDay | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await fetchTodayCalendar();
      setDay(data);
    } catch (err: any) {
      setError(err.message ?? 'שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toLocaleDateString('he-IL', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor="#c8a84b"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dateLabel}>{today}</Text>
          <Text style={styles.title}>לוח ביודינמי</Text>
        </View>

        {loading && (
          <ActivityIndicator size="large" color="#c8a84b" style={{ marginTop: 40 }} />
        )}

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {day && !loading && (
          <>
            <DayCard day={day} />

            {/* ChupChu daily tip */}
            {day.chupChuDailySummary ? (
              <View style={styles.chupChuCard}>
                <View style={styles.chupChuHeader}>
                  <Text style={styles.chupChuAvatar}>🌕</Text>
                  <Text style={styles.chupChuName}>צ'ופצ'ו</Text>
                </View>
                <Text style={styles.chupChuTip}>{day.chupChuDailySummary}</Text>
              </View>
            ) : null}

            {/* Moon times */}
            {(day.moonriseTime || day.moonsetTime) && (
              <View style={styles.timesCard}>
                {day.moonriseTime && (
                  <View style={styles.timeRow}>
                    <Text style={styles.timeEmoji}>🌑</Text>
                    <Text style={styles.timeLabel}>עליית ירח</Text>
                    <Text style={styles.timeValue}>{day.moonriseTime}</Text>
                  </View>
                )}
                {day.moonsetTime && (
                  <View style={styles.timeRow}>
                    <Text style={styles.timeEmoji}>🌘</Text>
                    <Text style={styles.timeLabel}>שקיעת ירח</Text>
                    <Text style={styles.timeValue}>{day.moonsetTime}</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1a3a2a',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: 'rgba(237,224,196,0.5)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#c8a84b',
    marginTop: 4,
  },
  errorText: {
    color: '#E06060',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  chupChuCard: {
    backgroundColor: 'rgba(28,58,30,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(200,168,75,0.2)',
    borderRightWidth: 3,
    borderRightColor: '#c8a84b',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  chupChuHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  chupChuAvatar: {
    fontSize: 22,
  },
  chupChuName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c8a84b',
  },
  chupChuTip: {
    fontSize: 14,
    color: '#EDE0C4',
    lineHeight: 22,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  timesCard: {
    backgroundColor: 'rgba(28,58,30,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(200,168,75,0.1)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  timeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  timeEmoji: {
    fontSize: 16,
  },
  timeLabel: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(237,224,196,0.7)',
    textAlign: 'right',
  },
  timeValue: {
    fontSize: 14,
    color: '#EDE0C4',
    fontWeight: '600',
  },
});
