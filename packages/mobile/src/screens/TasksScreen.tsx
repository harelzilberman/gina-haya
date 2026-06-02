import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator,
  StyleSheet, RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchPendingTasks, type PendingTask, completeTask, deleteTask, updateTaskTitle } from '../services/tasks';

export function TasksScreen() {
  const [tasks,     setTasks]     = useState<PendingTask[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await fetchPendingTasks();
      setTasks(data);
    } catch (err: any) {
      setError(err.message ?? 'שגיאה בטעינת המשימות');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useState(() => { load(); });

  const priorityColor = (p: string) =>
    p === 'high' ? '#e05050' : p === 'medium' ? '#c4860a' : '#4a7c3f';

  const handleTaskLongPress = (task: PendingTask) => {
    Alert.alert(
      task.title,
      'מה תרצה לעשות?',
      [
        {
          text: '✓ סמן כהושלם',
          onPress: async () => {
            try {
              await completeTask(task.id);
              setTasks(prev => prev.filter(t => t.id !== task.id));
            } catch (err: any) {
              Alert.alert('שגיאה', err.message);
            }
          },
        },
        {
          text: '✏️ ערוך כותרת',
          onPress: () => {
            Alert.prompt(
              'ערוך משימה',
              'שנה את כותרת המשימה',
              async (newTitle) => {
                if (!newTitle?.trim()) return;
                try {
                  await updateTaskTitle(task.id, newTitle.trim());
                  setTasks(prev => prev.map(t =>
                    t.id === task.id ? { ...t, title: newTitle.trim() } : t
                  ));
                } catch (err: any) {
                  Alert.alert('שגיאה', err.message);
                }
              },
              'plain-text',
              task.title,
            );
          },
        },
        {
          text: '🗑️ מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(task.id);
              setTasks(prev => prev.filter(t => t.id !== task.id));
            } catch (err: any) {
              Alert.alert('שגיאה', err.message);
            }
          },
        },
        { text: 'ביטול', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#c8a84b" />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>משימות 📋</Text>
          <Text style={styles.subtitle}>המשימות שצ'ופצ'ו יצר עבורך</Text>
        </View>

        {loading && <ActivityIndicator size="large" color="#c8a84b" style={{ marginTop: 40 }} />}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {!loading && !error && tasks.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyText}>אין משימות עדיין</Text>
            <Text style={styles.emptyHint}>בקש מצ'ופצ'ו ליצור משימות בשבילך</Text>
          </View>
        )}

        {tasks.map(task => (
          <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => handleTaskLongPress(task)}>
            <View style={[styles.priorityBar, { backgroundColor: priorityColor(task.priority) }]} />
            <View style={styles.taskBody}>
              <Text style={[
                styles.taskTitle,
                {
                  textDecorationLine: task.status === 'done' ? 'line-through' : 'none',
                  opacity: task.status === 'done' ? 0.4 : 1,
                }
              ]}>{task.title}</Text>
              <Text style={styles.taskHint}>לחץ לאפשרויות</Text>
              <View style={styles.taskMeta}>
                {task.due_date && (
                  <Text style={styles.taskDate}>
                    📅 {new Date(task.due_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}
                  </Text>
                )}
                <Text style={[styles.taskCategory, { color: priorityColor(task.priority) }]}>
                  {task.category}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, task.status === 'done' && styles.statusDone]}>
              <Text style={styles.statusText}>
                {task.status === 'done' ? '✓' : task.status === 'skipped' ? '–' : '○'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a0e' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  header: { alignItems: 'flex-end', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#c8a84b', textAlign: 'right' },
  subtitle: { fontSize: 13, color: 'rgba(237,224,196,0.5)', textAlign: 'right', marginTop: 2 },
  errorText: { color: '#E06060', textAlign: 'center', marginTop: 40, fontSize: 15 },
  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, color: 'rgba(237,224,196,0.6)', textAlign: 'center' },
  emptyHint: { fontSize: 13, color: 'rgba(237,224,196,0.35)', textAlign: 'center' },
  taskCard: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  priorityBar: { width: 4, alignSelf: 'stretch' },
  taskBody: { flex: 1, padding: 12, gap: 4, alignItems: 'flex-end' },
  taskTitle: { fontSize: 15, color: '#f5f0e8', textAlign: 'right', fontWeight: '500' },
  taskHint: { fontSize: 10, color: 'rgba(237,224,196,0.25)', textAlign: 'right' },
  taskMeta: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center' },
  taskDate: { fontSize: 12, color: 'rgba(237,224,196,0.5)' },
  taskCategory: { fontSize: 11, fontWeight: '600' },
  statusBadge: {
    width: 36, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statusDone: { backgroundColor: 'rgba(74,124,63,0.2)' },
  statusText: { fontSize: 16, color: 'rgba(237,224,196,0.5)' },
});
