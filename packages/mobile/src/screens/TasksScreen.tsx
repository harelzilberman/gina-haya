import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { theme } from '../theme';
import { supabase } from '../services/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'done' | 'dismissed';
  due_date?: string;
  category?: string;
}

export function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await fetch(
        `${API_URL}/api/tasks/range?start=${dateStr}&end=${dateStr}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      setTasks(data.tasks ?? data ?? []);
    } catch (e) {
      console.log('Tasks fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d);
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`${API_URL}/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: newStatus } : t
      ));
    } catch (e) {
      console.log('Toggle task error:', e);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('he-IL', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  };

  const renderTask = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={[styles.taskRow, item.status === 'done' && styles.taskDone]}
      onPress={() => toggleTask(item)}
    >
      <View style={[styles.checkbox, item.status === 'done' && styles.checkboxDone]}>
        {item.status === 'done' && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, item.status === 'done' && styles.taskTitleDone]}>
          {item.title}
        </Text>
        {item.category && (
          <Text style={styles.taskCategory}>{item.category}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Date Navigator */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.navBtn}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navBtn}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 40 }} />
      ) : tasks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>אין משימות להיום</Text>
          <Text style={styles.emptySubtext}>צ'ופצ'ו יעזור לך ליצור משימות</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  navBtn: {
    padding: theme.spacing.sm,
  },
  navArrow: {
    color: theme.colors.accent,
    fontSize: 28,
  },
  dateText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  list: {
    padding: theme.spacing.md,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  taskDone: {
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: theme.colors.accent,
  },
  checkmark: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  taskTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  taskCategory: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    marginTop: 2,
    textAlign: 'right',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.lg,
    writingDirection: 'rtl',
  },
  emptySubtext: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
    writingDirection: 'rtl',
  },
});
