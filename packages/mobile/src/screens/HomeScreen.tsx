import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';

import { MicButton } from '../components/MicButton';
import { ConfirmationCard } from '../components/ConfirmationCard';
import { OfflineBanner } from '../components/OfflineBanner';
import { fetchTodayCalendar } from '../services/calendar';
import { fetchPendingTasks, type PendingTask } from '../services/tasks';
import { sendChupChuMessage, executeTool, uploadJournalPhoto, type MobileToolCall } from '../services/chupchu';
import {
  startRecording, stopRecordingAndTranscribe,
  speakHebrew, stopSpeaking,
} from '../services/voice';
import { cacheBdDay, getCachedBdDay } from '../services/offline';
import { scheduleTaskNotification } from '../services/notifications';

type VoiceState = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking';

const DAY_TYPE_LABELS: Record<string, string> = {
  fruit: 'יום פרי 🍎',
  root:  'יום שורש 🥕',
  flower:'יום פרח 🌸',
  leaf:  'יום עלה 🌿',
};

const MOON_SIGNS_HE: Record<string, string> = {
  Aries: 'טלה', Taurus: 'שור', Gemini: 'תאומים', Cancer: 'סרטן',
  Leo: 'אריה', Virgo: 'בתולה', Libra: 'מאזניים', Scorpio: 'עקרב',
  Sagittarius: 'קשת', Capricorn: 'גדי', Aquarius: 'דלי', Pisces: 'דגים',
};

export function HomeScreen() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [offline,    setOffline]    = useState(false);
  const [calDay,     setCalDay]     = useState<any>(null);
  const [tasks,      setTasks]      = useState<PendingTask[]>([]);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const [toolCall,   setToolCall]   = useState<MobileToolCall | null>(null);
  const [executing,  setExecuting]  = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // ── Network & initial load ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setOffline(!(state.isConnected && state.isInternetReachable));
    });
    return () => unsub();
  }, []);

  const loadData = useCallback(async () => {
    // Calendar — check cache first, refresh if online
    const cached = await getCachedBdDay(today);
    if (cached) setCalDay(cached);

    try {
      const fresh = await fetchTodayCalendar();
      setCalDay(fresh);
      await cacheBdDay(today, fresh);
    } catch { /* use cache */ }

    // Pending tasks
    try {
      const pendingTasks = await fetchPendingTasks();
      setTasks(pendingTasks.slice(0, 2));
    } catch { /* ignore */ }
  }, [today]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Voice loop ──────────────────────────────────────────────────────────
  const handleMicPress = async () => {
    if (voiceState === 'speaking') {
      stopSpeaking();
      setVoiceState('idle');
      return;
    }

    if (voiceState === 'recording') {
      // Stop and process
      setVoiceState('transcribing');
      try {
        const text = await stopRecordingAndTranscribe();
        if (!text) { setVoiceState('idle'); return; }

        setVoiceState('thinking');
        const result = await sendChupChuMessage(text, []);

        setLastAnswer(result.response);

        if (result.mobileTool) {
          setToolCall(result.mobileTool);
        }

        setVoiceState('speaking');
        await speakHebrew(result.response);
        setVoiceState('idle');
      } catch (err: any) {
        setVoiceState('idle');
        Alert.alert('שגיאה', err.message ?? 'אירעה שגיאה, נסה שוב');
      }
      return;
    }

    if (voiceState === 'idle') {
      if (offline) {
        Alert.alert('אין חיבור', 'אני צריך חיבור לאינטרנט כדי לעזור לך');
        return;
      }
      try {
        await startRecording();
        setVoiceState('recording');
      } catch (err: any) {
        Alert.alert('שגיאה', 'לא ניתן להתחיל הקלטה — אנא אפשר גישה למיקרופון');
      }
    }
  };

  // ── Tool confirmation ───────────────────────────────────────────────────
  const handleToolConfirm = async () => {
    if (!toolCall) return;
    setExecuting(true);

    try {
      // Special case: journal entry — ask about photo
      if (toolCall.name === 'create_journal_entry' && !toolCall.params.photo_url) {
        setExecuting(false);
        setToolCall(null);
        await speakHebrew('רוצה להוסיף תמונה?');

        Alert.alert(
          'תמונה',
          'רוצה להוסיף תמונה לרשומה?',
          [
            {
              text: 'כן, פתח מצלמה',
              onPress: async () => {
                const perm = await ImagePicker.requestCameraPermissionsAsync();
                if (!perm.granted) {
                  await executeTool({ tool_name: toolCall.name, params: toolCall.params });
                  await speakHebrew('בוצע!');
                  return;
                }
                const pic = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  quality: 0.7,
                  base64: true,
                });
                let photoUrl: string | undefined;
                if (!pic.canceled && pic.assets[0]?.base64) {
                  try {
                    photoUrl = await uploadJournalPhoto(pic.assets[0].base64, 'image/jpeg');
                  } catch { /* continue without photo */ }
                }
                await executeTool({
                  tool_name: toolCall.name,
                  params: { ...toolCall.params, photo_url: photoUrl },
                });
                await speakHebrew('בוצע!');
                loadData();
              },
            },
            {
              text: 'לא',
              onPress: async () => {
                await executeTool({ tool_name: toolCall.name, params: toolCall.params });
                await speakHebrew('בוצע!');
                loadData();
              },
            },
          ]
        );
        return;
      }

      await executeTool({ tool_name: toolCall.name, params: toolCall.params });

      // Schedule notification for tasks with a due date
      if (toolCall.name === 'create_task' && toolCall.params.due_date) {
        try {
          await scheduleTaskNotification(
            String(toolCall.params.title),
            String(toolCall.params.due_date),
          );
        } catch { /* non-critical */ }
      }

      setToolCall(null);
      await speakHebrew('בוצע!');
      loadData();
    } catch (err: any) {
      Alert.alert('שגיאה', err.message ?? 'הפעולה נכשלה');
    } finally {
      setExecuting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  const dayLabel  = calDay ? (DAY_TYPE_LABELS[calDay.dayType] ?? calDay.dayType) : null;
  const moonLabel = calDay?.moonSign ? (MOON_SIGNS_HE[calDay.moonSign] ?? calDay.moonSign) : null;
  const score     = calDay?.plantingScore ?? null;

  const voiceLabel: Record<VoiceState, string> = {
    idle:         'דבר עם צ\'ופצ\'ו',
    recording:    'מקליט... לחץ לעצור',
    transcribing: 'מעבד...',
    thinking:     'צ\'ופצ\'ו חושב...',
    speaking:     'לחץ להפסיק',
  };

  return (
    <SafeAreaView style={styles.safe}>
      <OfflineBanner visible={offline} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: Chupchu character + greeting */}
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://gina-haya.vercel.app/chupchu_final.png' }}
            style={styles.avatar}
            resizeMode="contain"
          />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>שלום, אני צ'ופצ'ו</Text>
            <Text style={styles.subGreeting}>המומחה הביודינמי שלך</Text>
          </View>
        </View>

        {/* Biodynamic day info */}
        <View style={styles.bdCard}>
          {calDay ? (
            <>
              <View style={styles.bdRow}>
                <Text style={styles.bdDayType}>{dayLabel}</Text>
                {score !== null && (
                  <View style={[styles.scoreBadge, { backgroundColor: score >= 7 ? '#4a7c3f' : score >= 4 ? '#8a6a20' : '#703030' }]}>
                    <Text style={styles.scoreText}>{score}/10</Text>
                  </View>
                )}
              </View>
              {moonLabel && (
                <Text style={styles.moonLabel}>🌙 ירח ב{moonLabel}{calDay.ascendingDescending === 'ascending' ? ' — עולה' : ' — יורד'}</Text>
              )}
            </>
          ) : (
            <ActivityIndicator color="#c4860a" size="small" />
          )}
        </View>

        {/* Mic button — hero element */}
        <View style={styles.micSection}>
          <MicButton
            state={voiceState}
            onPress={handleMicPress}
            disabled={voiceState === 'transcribing' || voiceState === 'thinking'}
          />
          <Text style={styles.micLabel}>{voiceLabel[voiceState]}</Text>

          {lastAnswer && voiceState === 'idle' && (
            <View style={styles.lastAnswerCard}>
              <Text style={styles.lastAnswerText}>{lastAnswer}</Text>
            </View>
          )}
        </View>

        {/* Pending tasks */}
        {tasks.length > 0 && (
          <View style={styles.tasksSection}>
            <Text style={styles.tasksTitle}>משימות ממתינות</Text>
            {tasks.map(t => (
              <View key={t.id} style={styles.taskRow}>
                <View style={[styles.taskDot, { backgroundColor: t.priority === 'high' ? '#e05050' : t.priority === 'medium' ? '#c4860a' : '#4a7c3f' }]} />
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle}>{t.title}</Text>
                  {t.due_date && (
                    <Text style={styles.taskDue}>{new Date(t.due_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Confirmation card */}
      <ConfirmationCard
        visible={!!toolCall}
        descriptionHe={toolCall?.descriptionHe ?? ''}
        loading={executing}
        onConfirm={handleToolConfirm}
        onCancel={() => setToolCall(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1a1a0e',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(196,134,10,0.4)',
  },
  headerText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f5f0e8',
    textAlign: 'right',
  },
  subGreeting: {
    fontSize: 13,
    color: 'rgba(245,240,232,0.5)',
    textAlign: 'right',
    marginTop: 2,
  },
  bdCard: {
    width: '100%',
    backgroundColor: 'rgba(196,134,10,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(196,134,10,0.3)',
    borderRadius: 16,
    padding: 16,
    gap: 6,
    alignItems: 'flex-end',
  },
  bdRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  bdDayType: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#f5f0e8',
    textAlign: 'right',
  },
  scoreBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  scoreText: {
    color: '#f5f0e8',
    fontSize: 14,
    fontWeight: '700',
  },
  moonLabel: {
    fontSize: 14,
    color: 'rgba(245,240,232,0.7)',
    textAlign: 'right',
    width: '100%',
  },
  micSection: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  micLabel: {
    fontSize: 14,
    color: 'rgba(245,240,232,0.6)',
    textAlign: 'center',
  },
  lastAnswerCard: {
    backgroundColor: 'rgba(74,124,63,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(74,124,63,0.3)',
    borderRadius: 14,
    padding: 14,
    maxWidth: 320,
  },
  lastAnswerText: {
    fontSize: 14,
    color: '#f5f0e8',
    textAlign: 'right',
    lineHeight: 22,
  },
  tasksSection: {
    width: '100%',
    gap: 8,
  },
  tasksTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(245,240,232,0.55)',
    textAlign: 'right',
    marginBottom: 2,
  },
  taskRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  taskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  taskContent: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  taskTitle: {
    fontSize: 15,
    color: '#f5f0e8',
    textAlign: 'right',
  },
  taskDue: {
    fontSize: 12,
    color: 'rgba(245,240,232,0.45)',
    textAlign: 'right',
  },
});
