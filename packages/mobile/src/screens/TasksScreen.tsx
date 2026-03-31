import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator,
  StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from '../config/api';
import { getToken } from '../services/auth';
import { TaskCard } from '../components/TaskCard';

interface WeeklyPlan {
  weekStart:    string;
  weekEnd:      string;
  gardenTasks:  string[];
  days: Array<{
    date:                string;
    dayOfWeek:           string;
    dayTypeHe:           string;
    recommendedActions:  string[];
  }>;
}

const CHECKED_KEY_PREFIX = 'gina_haya_tasks_';

export function TasksScreen() {
  const [plan,       setPlan]       = useState<WeeklyPlan | null>(null);
  const [checked,   setChecked]   = useState<Record<string, boolean>>({});
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiFetch<WeeklyPlan>('/api/plans/current', token);
      setPlan(data);

      // Load saved checked state
      const key = `${CHECKED_KEY_PREFIX}${data.weekStart}`;
      const stored = await SecureStore.getItemAsync(key);
      setChecked(stored ? JSON.parse(stored) : {});
    } catch (err: any) {
      setError(err.message ?? 'שגיאה בטעינת המשימות');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleTask = async (taskId: string) => {
    const next = { ...checked, [taskId]: !checked[taskId] };
    setChecked(next);
    if (plan) {
      const key = `${CHECKED_KEY_PREFIX}${plan.weekStart}`;
      await SecureStore.setItemAsync(key, JSON.stringify(next));
    }
  };

  // Collect today's tasks from the plan
  const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  const todayPlan = plan?.days.find(d => d.date === todayISO);
  const allTasks  = [
    ...(todayPlan?.recommendedActions ?? []).map((t, i) => ({ id: `today_${i}`, label: t })),
    ...(plan?.gardenTasks ?? []).map((t, i) => ({ id: `weekly_${i}`, label: t })),
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#c8a84b" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>משימות</Text>
          {plan && (
            <Text style={styles.weekRange}>{plan.weekStart} – {plan.weekEnd}</Text>
          )}
        </View>

        {loading && <ActivityIndicator size="large" color="#c8a84b" style={{ marginTop: 40 }} />}
        {error   && <Text style={styles.errorText}>{error}</Text>}

        {!loading && !error && allTasks.length === 0 && (
          <Text style={styles.emptyText}>אין משימות לשבוע זה</Text>
        )}

        {todayPlan && todayPlan.recommendedActions.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>
              היום — {todayPlan.dayOfWeek} {todayPlan.dayTypeHe}
            </Text>
            {todayPlan.recommendedActions.map((task, i) => (
              <TaskCard
                key={`today_${i}`}
                task={task}
                checked={!!checked[`today_${i}`]}
                onToggle={() => toggleTask(`today_${i}`)}
              />
            ))}
          </>
        )}

        {plan && plan.gardenTasks.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>משימות שבועיות</Text>
            {plan.gardenTasks.map((task, i) => (
              <TaskCard
                key={`weekly_${i}`}
                task={task}
                checked={!!checked[`weekly_${i}`]}
                onToggle={() => toggleTask(`weekly_${i}`)}
              />
            ))}
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
    gap: 10,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#c8a84b',
  },
  weekRange: {
    fontSize: 12,
    color: 'rgba(237,224,196,0.5)',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(200,168,75,0.7)',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 2,
    letterSpacing: 0.4,
  },
  errorText: {
    color: '#E06060',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
  emptyText: {
    color: 'rgba(237,224,196,0.4)',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
});
