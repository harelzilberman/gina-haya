import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';

import { MicButton }        from '../components/MicButton';
import { ConfirmationCard } from '../components/ConfirmationCard';
import { OfflineBanner }    from '../components/OfflineBanner';

import {
  sendChupChuMessage, loadChupChuHistory,
  executeTool, uploadJournalPhoto,
  type MobileToolCall,
} from '../services/chupchu';
import { fetchTodayCalendar }              from '../services/calendar';
import { fetchPendingTasks, type PendingTask } from '../services/tasks';
import {
  startRecording, stopRecordingAndTranscribe,
  speakHebrew, stopSpeaking,
} from '../services/voice';
import { cacheBdDay, getCachedBdDay } from '../services/offline';
import * as ImagePicker from 'expo-image-picker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'chupchu' | 'user';
  text: string;
  timestamp: Date;
}

type VoiceState = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking';

// ─── Constants ────────────────────────────────────────────────────────────────

const GREETING = 'בוקר-בוקר טוב! מה הגינה שלך צריכה היום?\nצ\'יפ ✦';

const DAY_TYPE_LABELS: Record<string, string> = {
  fruit:  'יום פרי 🍎',
  root:   'יום שורש 🥕',
  flower: 'יום פרח 🌸',
  leaf:   'יום עלה 🌿',
};

const MOON_SIGNS_HE: Record<string, string> = {
  Aries: 'טלה', Taurus: 'שור', Gemini: 'תאומים', Cancer: 'סרטן',
  Leo: 'אריה', Virgo: 'בתולה', Libra: 'מאזניים', Scorpio: 'עקרב',
  Sagittarius: 'קשת', Capricorn: 'גדי', Aquarius: 'דלי', Pisces: 'דגים',
};

const VOICE_LABEL: Record<VoiceState, string> = {
  idle:         'דבר עם צ\'ופצ\'ו',
  recording:    'מקליט... לחץ לעצור',
  transcribing: 'מעבד...',
  thinking:     'צ\'ופצ\'ו חושב...',
  speaking:     'לחץ להפסיק',
};

// ─── Animated head hooks ──────────────────────────────────────────────────────

function useEyeGlow(offsetMs: number) {
  const opacity = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.2,  duration: 1200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.95, duration: 1000, useNativeDriver: true }),
        ]),
      ).start();
    }, offsetMs);
    return () => clearTimeout(t);
  }, [opacity, offsetMs]);
  return opacity;
}

function useAntennaPulse(offsetMs: number) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 0.6, duration: 800, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1,   duration: 800, useNativeDriver: true }),
        ]),
      ).start();
    }, offsetMs);
    return () => clearTimeout(t);
  }, [scale, offsetMs]);
  return scale;
}

function useBlink() {
  const scaleY = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = () => {
      const t = setTimeout(() => {
        Animated.sequence([
          Animated.timing(scaleY, { toValue: 0.05, duration: 80, useNativeDriver: true }),
          Animated.timing(scaleY, { toValue: 1,    duration: 80, useNativeDriver: true }),
        ]).start(() => loop());
      }, 4000 + Math.random() * 2000);
      return t;
    };
    const t = loop();
    return () => clearTimeout(t);
  }, [scaleY]);
  return scaleY;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChupChuHead() {
  const leftEye      = useEyeGlow(0);
  const rightEye     = useEyeGlow(600);
  const leftAntenna  = useAntennaPulse(0);
  const rightAntenna = useAntennaPulse(1600);
  const blinkScaleY  = useBlink();

  return (
    <View style={styles.headSection}>
      <View style={styles.imageWrap}>
        <Animated.View style={[styles.antennaTip, styles.leftAntennaTip,  { transform: [{ scale: leftAntenna  }] }]} />
        <Animated.View style={[styles.antennaTip, styles.rightAntennaTip, { transform: [{ scale: rightAntenna }] }]} />

        <Animated.View style={[styles.imageContainer, { transform: [{ scaleY: blinkScaleY }] }]}>
          <Image source={require('../assets/chupchu_head.jpg')} style={styles.headImage} />
        </Animated.View>

        <Animated.View style={[styles.eyeGlow, styles.leftEye,  { opacity: leftEye  }]} />
        <Animated.View style={[styles.eyeGlow, styles.rightEye, { opacity: rightEye }]} />
      </View>

      <Text style={styles.headName}>צ'ופצ'ו ✦</Text>
      <Text style={styles.headSubtitle}>שומר הגינה הביודינמית</Text>
    </View>
  );
}

function DashboardRow({
  calDay, tasks, loading,
}: {
  calDay: any;
  tasks: PendingTask[];
  loading: boolean;
}) {
  if (loading && !calDay) {
    return (
      <View style={styles.dashRow}>
        <ActivityIndicator color="#c4860a" size="small" style={{ flex: 1 }} />
      </View>
    );
  }

  const dayLabel  = calDay ? (DAY_TYPE_LABELS[calDay.dayType]  ?? calDay.dayType)               : '—';
  const moonLabel = calDay?.moonSign ? (MOON_SIGNS_HE[calDay.moonSign] ?? calDay.moonSign)       : '—';
  const score     = calDay?.plantingScore ?? null;

  return (
    <View style={styles.dashRow}>
      {/* Day type */}
      <View style={styles.dashCard}>
        <Text style={styles.dashCardValue} numberOfLines={1}>{dayLabel}</Text>
        <Text style={styles.dashCardLabel}>סוג יום</Text>
      </View>

      {/* Moon */}
      <View style={styles.dashCard}>
        <Text style={styles.dashCardValue} numberOfLines={1}>🌙 {moonLabel}</Text>
        <Text style={styles.dashCardLabel}>מזל הירח</Text>
      </View>

      {/* Score / tasks */}
      <View style={styles.dashCard}>
        {score !== null ? (
          <>
            <Text style={[
              styles.dashCardValue,
              { color: score >= 7 ? '#7ec87e' : score >= 4 ? '#c4860a' : '#e06060' },
            ]}>
              {score}/10
            </Text>
            <Text style={styles.dashCardLabel}>ניקוד שתילה</Text>
          </>
        ) : (
          <>
            <Text style={styles.dashCardValue}>{tasks.length}</Text>
            <Text style={styles.dashCardLabel}>משימות</Text>
          </>
        )}
      </View>
    </View>
  );
}

function TypingIndicator() {
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(val, { toValue:  0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ]),
      );
    Animated.parallel([anim(d1, 0), anim(d2, 200), anim(d3, 400)]).start();
  }, [d1, d2, d3]);

  return (
    <View style={styles.typingBubble}>
      {[d1, d2, d3].map((d, i) => (
        <Animated.View key={i} style={[styles.typingDot, { transform: [{ translateY: d }] }]} />
      ))}
    </View>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isChupchu = message.role === 'chupchu';
  return (
    <View style={[styles.bubbleRow, isChupchu ? styles.bubbleRowChupchu : styles.bubbleRowUser]}>
      <View style={[styles.bubble, isChupchu ? styles.bubbleChupchu : styles.bubbleUser]}>
        <Text style={[styles.bubbleText, isChupchu ? styles.bubbleTextChupchu : styles.bubbleTextUser]}>
          {message.text}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ChupChuScreen() {
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [input,       setInput]       = useState('');
  const [sending,     setSending]     = useState(false);
  const [voiceState,  setVoiceState]  = useState<VoiceState>('idle');
  const [offline,     setOffline]     = useState(false);
  const [calDay,      setCalDay]      = useState<any>(null);
  const [tasks,       setTasks]       = useState<PendingTask[]>([]);
  const [dashLoading, setDashLoading] = useState(true);
  const [toolCall,    setToolCall]    = useState<MobileToolCall | null>(null);
  const [executing,   setExecuting]   = useState(false);

  const listRef = useRef<FlatList>(null);
  const today   = new Date().toISOString().split('T')[0];

  // ── Network ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setOffline(!(state.isConnected && state.isInternetReachable));
    });
    return () => unsub();
  }, []);

  // ── Dashboard data ────────────────────────────────────────────────────────
  const loadDash = useCallback(async () => {
    setDashLoading(true);
    const cached = await getCachedBdDay(today);
    if (cached) setCalDay(cached);

    try {
      const fresh = await fetchTodayCalendar();
      setCalDay(fresh);
      await cacheBdDay(today, fresh);
    } catch { /* use cache */ }

    try {
      const t = await fetchPendingTasks();
      setTasks(t.slice(0, 5));
    } catch { /* ignore */ }

    setDashLoading(false);
  }, [today]);

  useEffect(() => { loadDash(); }, [loadDash]);

  // ── Chat history ──────────────────────────────────────────────────────────
  useEffect(() => {
    const greeting: Message = {
      id: 'greeting', role: 'chupchu',
      text: GREETING, timestamp: new Date(),
    };
    loadChupChuHistory().then(history => {
      if (history.length > 0) {
        setMessages(history.map((m, i) => ({
          id: String(i),
          role: m.role === 'user' ? 'user' : 'chupchu',
          text: m.role === 'assistant' ? `${m.content}\nצ'יפ ✦` : m.content,
          timestamp: new Date(m.timestamp),
        })));
      } else {
        setMessages([greeting]);
      }
    });
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [messages]);

  // ── Text send ─────────────────────────────────────────────────────────────
  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(), role: 'user',
      text: trimmed, timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      const result = await sendChupChuMessage(trimmed, []);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(), role: 'chupchu',
        text: `${result.response}\nצ'יפ ✦`, timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      if (result.mobileTool) setToolCall(result.mobileTool);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'chupchu',
        text: "צ'יפ... משהו השתבש, נסה שוב", timestamp: new Date(),
      }]);
    } finally {
      setSending(false);
    }
  };

  // ── Voice ─────────────────────────────────────────────────────────────────
  const handleMicPress = async () => {
    if (voiceState === 'speaking') {
      stopSpeaking();
      setVoiceState('idle');
      return;
    }
    if (voiceState === 'recording') {
      setVoiceState('transcribing');
      try {
        const text = await stopRecordingAndTranscribe();
        if (!text) { setVoiceState('idle'); return; }

        // Show user's transcribed text as a bubble
        const userMsg: Message = {
          id: Date.now().toString(), role: 'user',
          text, timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setVoiceState('thinking');

        const result = await sendChupChuMessage(text, []);
        const botMsg: Message = {
          id: (Date.now() + 1).toString(), role: 'chupchu',
          text: `${result.response}\nצ'יפ ✦`, timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMsg]);
        if (result.mobileTool) setToolCall(result.mobileTool);

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
        Alert.alert('שגיאה', err.message ?? 'לא ניתן להתחיל הקלטה');
      }
    }
  };

  // ── Tool confirmation ─────────────────────────────────────────────────────
  const handleToolConfirm = async () => {
    if (!toolCall) return;
    setExecuting(true);

    try {
      if (toolCall.name === 'create_journal_entry' && !toolCall.params.photo_url) {
        setExecuting(false);
        setToolCall(null);

        Alert.alert('תמונה', 'רוצה להוסיף תמונה לרשומה?', [
          {
            text: 'כן, פתח מצלמה',
            onPress: async () => {
              const perm = await ImagePicker.requestCameraPermissionsAsync();
              let photoUrl: string | undefined;
              if (perm.granted) {
                const pic = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  quality: 0.7, base64: true,
                });
                if (!pic.canceled && pic.assets[0]?.base64) {
                  try { photoUrl = await uploadJournalPhoto(pic.assets[0].base64, 'image/jpeg'); }
                  catch { /* continue */ }
                }
              }
              await executeTool({ tool_name: toolCall.name, params: { ...toolCall.params, photo_url: photoUrl } });
              await speakHebrew('בוצע!');
              loadDash();
            },
          },
          {
            text: 'לא',
            onPress: async () => {
              await executeTool({ tool_name: toolCall.name, params: toolCall.params });
              await speakHebrew('בוצע!');
              loadDash();
            },
          },
        ]);
        return;
      }

      await executeTool({ tool_name: toolCall.name, params: toolCall.params });
      setToolCall(null);
      await speakHebrew('בוצע!');
      loadDash();
    } catch (err: any) {
      Alert.alert('שגיאה', err.message ?? 'הפעולה נכשלה');
    } finally {
      setExecuting(false);
    }
  };

  // ── FlatList header (head + dashboard) ───────────────────────────────────
  const ListHeader = (
    <>
      <ChupChuHead />
      <DashboardRow calDay={calDay} tasks={tasks} loading={dashLoading} />
    </>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <OfflineBanner visible={offline} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header bar */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>צ'ופצ'ו 💬</Text>
          <Text style={styles.headerSub}>שומר הגינה הביודינמית</Text>
        </View>

        {/* Chat list */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={sending ? <TypingIndicator /> : null}
          style={styles.list}
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          {/* Mic button — left side */}
          <MicButton
            state={voiceState}
            onPress={handleMicPress}
            disabled={voiceState === 'transcribing' || voiceState === 'thinking' || sending}
          />

          {/* Text input */}
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="שאל את צ'ופצ'ו..."
            placeholderTextColor="#2d5035"
            multiline
            textAlign="right"
            writingDirection="rtl"
            returnKeyType="send"
            onSubmitEditing={() => sendText(input)}
            blurOnSubmit={false}
            editable={!sending && voiceState === 'idle'}
          />

          {/* Send button — right side */}
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || sending) && styles.sendDisabled]}
            onPress={() => sendText(input)}
            disabled={!input.trim() || sending}
          >
            <Text style={styles.sendArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Voice state hint */}
        {voiceState !== 'idle' && (
          <Text style={styles.voiceHint}>{VOICE_LABEL[voiceState]}</Text>
        )}
      </KeyboardAvoidingView>

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#060e08' },
  flex: { flex: 1 },

  // Header bar
  header: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0d2010',
    backgroundColor: '#060e08',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#f5a623',
    writingDirection: 'rtl',
  },
  headerSub: {
    fontSize: 11,
    color: '#2d5035',
    marginTop: 1,
    writingDirection: 'rtl',
  },

  // Animated head
  headSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 8,
  },
  imageWrap: {
    width: 160,
    height: 180,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  antennaTip: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f5a623',
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
  leftAntennaTip:  { top: 8, left: 42 },
  rightAntennaTip: { top: 8, right: 42 },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#1a3d1f',
    marginTop: 40,
  },
  headImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  eyeGlow: {
    position: 'absolute',
    width: 22,
    height: 14,
    borderRadius: 11,
    backgroundColor: '#f5a623',
  },
  leftEye:  { top: 92, left: 26 },
  rightEye: { top: 92, right: 26 },
  headName: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '700',
    color: '#e8d4a8',
    writingDirection: 'rtl',
  },
  headSubtitle: {
    fontSize: 12,
    color: '#2d5035',
    marginTop: 3,
    writingDirection: 'rtl',
  },

  // Dashboard row
  dashRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 16,
    paddingTop: 4,
  },
  dashCard: {
    flex: 1,
    backgroundColor: '#0d2010',
    borderWidth: 1,
    borderColor: '#1a3d1f',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  dashCardValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e8d4a8',
    textAlign: 'center',
  },
  dashCardLabel: {
    fontSize: 10,
    color: '#2d5035',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  // Chat list
  list: { flex: 1 },
  listContent: { paddingBottom: 8 },

  // Bubbles
  bubbleRow: {
    paddingHorizontal: 14,
    paddingVertical: 3,
  },
  bubbleRowChupchu: { alignItems: 'flex-end' },
  bubbleRowUser:    { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleChupchu: {
    backgroundColor: '#0d2010',
    borderColor: '#1a3d1f',
    borderRadius: 4,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 14,
  },
  bubbleUser: {
    backgroundColor: '#0a2d15',
    borderColor: '#1a5020',
    borderRadius: 14,
    borderTopLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  bubbleTextChupchu: { color: '#d4c49a' },
  bubbleTextUser:    { color: '#b8d4be' },

  // Typing indicator
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 14,
    marginVertical: 6,
    alignSelf: 'flex-end',
    backgroundColor: '#0d2010',
    borderWidth: 1,
    borderColor: '#1a3d1f',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#f5a623',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#07110a',
    borderTopWidth: 1,
    borderTopColor: '#0d2010',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#c8d4c0',
    maxHeight: 100,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a6b35',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendDisabled: { opacity: 0.35 },
  sendArrow: { fontSize: 18, color: '#e8f5eb', fontWeight: '700' },

  // Voice hint
  voiceHint: {
    fontSize: 12,
    color: 'rgba(245,240,232,0.45)',
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: '#07110a',
    writingDirection: 'rtl',
  },
});
