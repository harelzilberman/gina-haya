import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
const IMG_W    = SCREEN_W - 32;
const IMG_H    = IMG_W * (1024 / 1536);
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
import { getToken }                           from '../services/auth';
import { fetchTodayCalendar }              from '../services/calendar';
import { fetchPendingTasks, type PendingTask } from '../services/tasks';
let startRecording: any, stopRecordingAndTranscribe: any, speakHebrew: any, stopSpeaking: any;
try {
  const voice = require('../services/voice');
  startRecording            = voice.startRecording;
  stopRecordingAndTranscribe = voice.stopRecordingAndTranscribe;
  speakHebrew               = voice.speakHebrew;
  stopSpeaking              = voice.stopSpeaking;
} catch {
  startRecording             = async () => { throw new Error('Voice not available'); };
  stopRecordingAndTranscribe = async () => null;
  speakHebrew                = async () => {};
  stopSpeaking               = () => {};
}
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

const DAY_TYPE_INFO: Record<string, string> = {
  fruit:  'יום פרי — זמן מצוין לקטיף, זריעת פירות וירקות פרי כמו עגבניות, מלפפונים ופלפלים. הכוחות ביקום תומכים בפיתוח הפרי.',
  root:   'יום שורש — זמן מעולה לשתילת שורשים, גזר, סלק, צנון ובצל. הירח תומך בגדילה מתחת לאדמה.',
  flower: 'יום פרח — הזמן הטוב ביותר לפרחים, עשבי תיבול ולשתילת צמחים לצורכי נוי. כוחות הפריחה בשיאם.',
  leaf:   'יום עלה — יום טוב לירקות עלים כמו חסה, תרד ועשבי תיבול. השקיה ודישון עלים יעילים במיוחד.',
};

const SCORE_INFO: Record<number, string> = {
  10: 'יום מושלם לגינון! כל הכוחות הביודינמיים בשיאם.',
  9:  'יום מצוין — כמעט כל פעילות גינון תצליח היום.',
  8:  'יום טוב מאוד לגינון ושתילה.',
  7:  'יום טוב — תנאים נוחים לרוב פעילויות הגינון.',
  6:  'יום סביר — עדיף להתמקד בפעילויות הקשורות לסוג היום.',
  5:  'יום בינוני — אפשר לגנן אבל לא זמן השיא.',
  4:  'יום חלש יחסית — עדיף לפעולות תחזוקה בלבד.',
  3:  'יום לא אידיאלי לשתילה — עדיף לחכות.',
  2:  'יום חלש — עדיף להימנע משתילה ורכיבה.',
  1:  'יום קשה — מומלץ להימנע מפעילות גינון משמעותית.',
  0:  'יום מנוחה לגינה — תן לאדמה לנוח.',
};

const VOICE_LABEL: Record<VoiceState, string> = {
  idle:         'דבר עם צ\'ופצ\'ו',
  recording:    'מקליט... לחץ לעצור',
  transcribing: 'מעבד...',
  thinking:     'צ\'ופצ\'ו חושב...',
  speaking:     'לחץ להפסיק',
};

// ─── Animated head hooks ──────────────────────────────────────────────────────

function useEyeRipple(offsetMs: number) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const delay = setTimeout(() => {
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: false,
        })
      ).start();
    }, offsetMs);
    return () => clearTimeout(delay);
  }, [anim, offsetMs]);
  return anim;
}

function useFirefly(baseDelay: number) {
  const opacity  = useRef(new Animated.Value(0)).current;
  const alive    = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    alive.current = true;
    const flicker = () => {
      if (!alive.current) return;
      const onDuration  = 800  + Math.random() * 1200;
      const offDuration = 1000 + Math.random() * 2000;
      const pauseBefore = baseDelay + Math.random() * 1500;
      timerRef.current = setTimeout(() => {
        if (!alive.current) return;
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.9,  duration: onDuration,  useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.05, duration: offDuration, useNativeDriver: true }),
        ]).start(({ finished }) => { if (finished) flicker(); });
      }, pauseBefore);
    };
    flicker();
    return () => {
      alive.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      opacity.stopAnimation();
    };
  }, [opacity, baseDelay]);
  return opacity;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const signMessages = [
  'לחץ לתפריט',
  'הגינה שלך',
  'כל המסכים',
  'press me',
  'web app →',
];

function ChupChuHead({ isSpeaking, onSpiderPress }: { isSpeaking: boolean; onSpiderPress: () => void }) {
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const leftRipple1  = useEyeRipple(0);
  const leftRipple2  = useEyeRipple(533);
  const leftRipple3  = useEyeRipple(1066);
  const rightRipple1 = useEyeRipple(300);
  const rightRipple2 = useEyeRipple(833);
  const rightRipple3 = useEyeRipple(1366);
  const leftAntennaOpacity  = useFirefly(0);
  const rightAntennaOpacity = useFirefly(1800);

  const leftGlowOpacity  = useRef(new Animated.Value(0.3)).current;
  const rightGlowOpacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const makeAnim = (val: Animated.Value) => Animated.loop(Animated.sequence([
      Animated.timing(val, { toValue: 0.9, duration: 1800, useNativeDriver: true }),
      Animated.timing(val, { toValue: 0.3, duration: 1800, useNativeDriver: true }),
    ]));
    const la = makeAnim(leftGlowOpacity);
    const ra = makeAnim(rightGlowOpacity);
    la.start();
    setTimeout(() => ra.start(), 900);
    return () => { la.stop(); ra.stop(); };
  }, [leftGlowOpacity, rightGlowOpacity]);

  const [signIndex, setSignIndex] = useState(0);
  const signOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const cycle = () => {
      Animated.sequence([
        Animated.delay(2200),
        Animated.timing(signOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(signOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        setSignIndex(i => (i + 1) % signMessages.length);
        cycle();
      });
    };
    cycle();
    return () => signOpacity.stopAnimation();
  }, [signOpacity]);

  // Percentages measured from chupchu_web_in_hole.png
  const pct = {
    leftAntenna:  { x: 0.366, y: 0.120 },
    rightAntenna: { x: 0.475, y: 0.064 },
    leftEye:      { x: 0.454, y: 0.472 },
    rightEye:     { x: 0.535, y: 0.472 },
  };

  const { width: iw, height: ih } = imgSize;

  return (
    <View style={styles.headSection}>
      <View style={styles.imageWrap}>
        <Image
          source={require('../assets/chupchu_web_in_hole.png')}
          style={styles.headImage}
          resizeMode="contain"
          onLayout={e => {
            const { width, height } = e.nativeEvent.layout;
            setImgSize({ width, height });
          }}
        />
        {iw > 0 && (
          <>
            {/* Left eye — glow dot + rim overlay */}
            <View style={{ position: 'absolute', left: iw * 0.451 - 8.08, top: ih * 0.479 + 1.38 }}>
              <Animated.View style={{
                width: 14, height: 14, borderRadius: 7,
                backgroundColor: '#ffe8a0',
                opacity: leftGlowOpacity,
              }} />
              <View style={{
                position: 'absolute', left: -4, top: -4,
                width: 22, height: 22, borderRadius: 11,
                borderWidth: 5, borderColor: '#3d1e08',
                backgroundColor: 'transparent',
              }} />
            </View>
            {/* Right eye — glow dot + rim overlay */}
            <View style={{ position: 'absolute', left: iw * 0.535 - 2, top: ih * 0.479 + 5.7 }}>
              <Animated.View style={{
                width: 14, height: 14, borderRadius: 7,
                backgroundColor: '#ffe8a0',
                opacity: rightGlowOpacity,
              }} />
              <View style={{
                position: 'absolute', left: -4, top: -4,
                width: 22, height: 22, borderRadius: 11,
                borderWidth: 5, borderColor: '#3d1e08',
                backgroundColor: 'transparent',
              }} />
            </View>
            {/* Antenna pulse dots — locked positions, firefly animated */}
            <Animated.View style={[styles.antennaTip, {
              position: 'absolute',
              left: iw * 0.366 + 0.45,
              top:  ih * 0.120 + 36.89,
              opacity: leftAntennaOpacity,
            }]} />
            <Animated.View style={[styles.antennaTip, {
              position: 'absolute',
              left: iw * 0.475 + 39.28,
              top:  ih * 0.064 + 58.05,
              opacity: rightAntennaOpacity,
            }]} />
          </>
        )}

        {/* Animated sign text overlay on the spider's sign */}
        <TouchableOpacity
          style={styles.signTapZone}
          onPress={onSpiderPress}
          activeOpacity={0.7}
        >
          <Animated.Text style={[styles.signText, { opacity: signOpacity }]}>
            {signMessages[signIndex]}
          </Animated.Text>
        </TouchableOpacity>

        {/* Wide tap zone covering the whole web area */}
        <TouchableOpacity
          style={styles.webTapZone}
          onPress={onSpiderPress}
          activeOpacity={0}
        />
      </View>

      <Text style={styles.headName}>צ'ופצ'ו ✦</Text>
      <Text style={styles.headSubtitle}>שומר הגינה הביודינמית</Text>
    </View>
  );
}

function DashboardRow({
  calDay, tasks, loading, onCardPress,
}: {
  calDay: any;
  tasks: PendingTask[];
  loading: boolean;
  onCardPress: (card: 'day' | 'moon' | 'score') => void;
}) {
  if (loading && !calDay) {
    return (
      <View style={styles.dashRow}>
        <ActivityIndicator color="#c4860a" size="small" style={{ flex: 1 }} />
      </View>
    );
  }

  const dayLabel  = calDay ? (DAY_TYPE_LABELS[calDay.dayType]  ?? calDay.dayType) : '—';
  const moonLabel = calDay?.moonSign ? (MOON_SIGNS_HE[calDay.moonSign] ?? calDay.moonSign) : '—';
  const score     = calDay?.plantingScore ?? null;

  return (
    <View style={styles.dashRow}>
      {/* Day type */}
      <TouchableOpacity style={styles.dashCard} onPress={() => onCardPress('day')}>
        <Text style={styles.dashCardValue} numberOfLines={1}>{dayLabel}</Text>
        <Text style={styles.dashCardLabel}>סוג יום</Text>
      </TouchableOpacity>

      {/* Moon */}
      <TouchableOpacity style={styles.dashCard} onPress={() => onCardPress('moon')}>
        <Text style={styles.dashCardValue} numberOfLines={1}>🌙 {moonLabel}</Text>
        <Text style={styles.dashCardLabel}>מזל הירח</Text>
      </TouchableOpacity>

      {/* Score / tasks */}
      <TouchableOpacity style={styles.dashCard} onPress={() => onCardPress('score')}>
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
      </TouchableOpacity>
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

function PhotoActionCard({
  onJournal,
  onTrack,
  onDismiss,
}: {
  onJournal: () => void;
  onTrack: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.actionCard}>
      <Text style={styles.actionCardTitle}>רוצה לתעד את זה? 📸</Text>
      <View style={styles.actionCardButtons}>
        <TouchableOpacity style={styles.actionBtn} onPress={onJournal}>
          <Text style={styles.actionBtnIcon}>📓</Text>
          <Text style={styles.actionBtnText}>הוסף ליומן</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnTrack]} onPress={onTrack}>
          <Text style={styles.actionBtnIcon}>📊</Text>
          <Text style={styles.actionBtnText}>התחל מעקב</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onDismiss} style={styles.actionDismiss}>
        <Text style={styles.actionDismissText}>לא תודה</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ChupChuScreen() {
  const navigation = useNavigation<any>();
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
  const [activeCard,  setActiveCard]  = useState<'day' | 'moon' | 'score' | null>(null);
  const [analyzing,   setAnalyzing]   = useState(false);
  const [webMenuOpen, setWebMenuOpen] = useState(false);
  const [pendingPhotoAction, setPendingPhotoAction] = useState<{
    base64: string;
    analysis: string;
  } | null>(null);

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

  // ── Photo analysis ───────────────────────────────────────────────────────
  const analyzeImage = async (base64: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      text: '📸 שלחתי תמונה מהגינה',
      timestamp: new Date(),
    }]);
    setAnalyzing(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        'https://powerful-embrace-production-95ea.up.railway.app/api/chupchu/analyze-image',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            image: base64,
            mimeType: 'image/jpeg',
            language: 'he',
          }),
        }
      );

      console.log('🔴 ANALYZE STATUS:', response.status);
      const data = await response.json();
      console.log('🔴 ANALYZE RESPONSE:', JSON.stringify(data));
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: 'chupchu' as const,
        text: `${data.response ?? 'לא הצלחתי לנתח את התמונה'}\nצ'יפ ✦`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      if (data.response) {
        setPendingPhotoAction({ base64, analysis: data.response });
      }
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'chupchu',
        text: "צ'יפ... לא הצלחתי לנתח את התמונה, נסה שוב\nצ'יפ ✦",
        timestamp: new Date(),
      }]);
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePhotoAnalysis = () => {
    Alert.alert(
      'בחר תמונה',
      'מאיפה לטעון את התמונה?',
      [
        {
          text: 'מצלמה',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('אין הרשאה', 'נדרשת הרשאה למצלמה');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              quality: 0.7,
              base64: true,
            });
            if (!result.canceled && result.assets[0]?.base64) {
              await analyzeImage(result.assets[0].base64);
            }
          },
        },
        {
          text: 'גלריה',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('נדרשת הרשאה', 'אנא אשר גישה לגלריה בהגדרות');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
              base64: true,
            });
            if (!result.canceled && result.assets[0]?.base64) {
              await analyzeImage(result.assets[0].base64);
            }
          },
        },
        { text: 'ביטול', style: 'cancel' },
      ]
    );
  };

  // ── Photo action handlers ─────────────────────────────────────────────────
  const handleJournalFromPhoto = async () => {
    if (!pendingPhotoAction) return;
    try {
      const token = await getToken();
      await fetch('https://powerful-embrace-production-95ea.up.railway.app/api/chupchu/execute-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tool_name: 'create_journal_entry',
          params: {
            notes: pendingPhotoAction.analysis,
            title: 'תמונה מהגינה',
          },
        }),
      });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'chupchu',
        text: "נרשם ביומן! ✦ אשמור את זה בזיכרון הגינה שלך\nצ'יפ ✦",
        timestamp: new Date(),
      }]);
    } catch {
      // silent fail
    } finally {
      setPendingPhotoAction(null);
    }
  };

  const handleTrackFromPhoto = async () => {
    if (!pendingPhotoAction) return;
    try {
      const token = await getToken();
      await fetch('https://powerful-embrace-production-95ea.up.railway.app/api/chupchu/execute-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tool_name: 'create_task',
          params: {
            title: 'מעקב — תמונה מהגינה',
            notes: pendingPhotoAction.analysis,
            priority: 'medium',
          },
        }),
      });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'chupchu',
        text: "נוצרה משימת מעקב! אעקוב איתך אחרי ההתפתחות 🌱\nצ'יפ ✦",
        timestamp: new Date(),
      }]);
    } catch {
      // silent fail
    } finally {
      setPendingPhotoAction(null);
    }
  };

  // ── Voice ─────────────────────────────────────────────────────────────────
  const handleMicPress = async () => {
    try {
      if (voiceState === 'speaking') {
        stopSpeaking();
        setVoiceState('idle');
        return;
      }
      if (voiceState === 'recording') {
        setVoiceState('transcribing');
        const text = await stopRecordingAndTranscribe();
        if (!text) { setVoiceState('idle'); return; }
        setVoiceState('thinking');
        const result = await sendChupChuMessage(text, []);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'chupchu',
          text: `${result.response}\nצ'יפ ✦`,
          timestamp: new Date(),
        }]);
        setVoiceState('speaking');
        await speakHebrew(result.response);
        setVoiceState('idle');
        return;
      }
      if (voiceState === 'idle') {
        await startRecording();
        setVoiceState('recording');
      }
    } catch (err: any) {
      setVoiceState('idle');
      Alert.alert('המיקרופון אינו זמין', 'פונקציית הקול אינה זמינה ב-Expo Go. השתמש בהקלדה.');
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
      <ChupChuHead isSpeaking={voiceState === 'speaking'} onSpiderPress={() => setWebMenuOpen(true)} />
      <DashboardRow calDay={calDay} tasks={tasks} loading={dashLoading} onCardPress={setActiveCard} />
    </>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <OfflineBanner visible={offline} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 90 : 0}
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
          ListFooterComponent={
            <>
              {sending && <TypingIndicator />}
              {analyzing && <TypingIndicator />}
              {pendingPhotoAction && (
                <PhotoActionCard
                  onJournal={handleJournalFromPhoto}
                  onTrack={handleTrackFromPhoto}
                  onDismiss={() => setPendingPhotoAction(null)}
                />
              )}
            </>
          }
          style={styles.list}
        />

        {/* Dashboard info modal */}
        <Modal
          visible={activeCard !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setActiveCard(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setActiveCard(null)}
            activeOpacity={1}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              {activeCard === 'day' && (
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{DAY_TYPE_LABELS[calDay?.dayType] ?? '—'}</Text>
                  <Text style={styles.modalBody}>{DAY_TYPE_INFO[calDay?.dayType] ?? ''}</Text>
                </View>
              )}

              {activeCard === 'moon' && (
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>🌙 {MOON_SIGNS_HE[calDay?.moonSign] ?? '—'}</Text>
                  <Text style={styles.modalSubtitle}>
                    {calDay?.ascendingDescending === 'ascending' ? '🌒 ירח עולה' : '🌘 ירח יורד'}
                  </Text>
                  {calDay?.moonriseTime && <Text style={styles.modalBody}>זריחת ירח: {calDay.moonriseTime}</Text>}
                  {calDay?.moonsetTime  && <Text style={styles.modalBody}>שקיעת ירח: {calDay.moonsetTime}</Text>}
                </View>
              )}

              {activeCard === 'score' && (
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>ניקוד שתילה {calDay?.plantingScore ?? '—'}/10</Text>
                  <Text style={styles.modalBody}>{SCORE_INFO[calDay?.plantingScore ?? 0] ?? ''}</Text>
                </View>
              )}

              <TouchableOpacity style={styles.modalClose} onPress={() => setActiveCard(null)}>
                <Text style={styles.modalCloseText}>סגור</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Spider web navigation modal */}
        <Modal
          visible={webMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setWebMenuOpen(false)}
        >
          <TouchableOpacity
            style={styles.webMenuOverlay}
            activeOpacity={1}
            onPress={() => setWebMenuOpen(false)}
          >
            <View style={styles.webMenuContainer}>

              {/* Spider web SVG background */}
              <Svg width={300} height={300} viewBox="0 0 300 300" style={StyleSheet.absoluteFill}>
                {[0,1,2,3,4,5,6].map(i => {
                  const angle = (i * 360/7 - 90) * Math.PI / 180;
                  return (
                    <Line key={i}
                      x1={150} y1={150}
                      x2={150 + Math.cos(angle)*130}
                      y2={150 + Math.sin(angle)*130}
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth={0.8}
                    />
                  );
                })}
                {[35,70,105,130].map(r => (
                  <Circle key={r} cx={150} cy={150} r={r}
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth={0.6}
                  />
                ))}
              </Svg>

              {/* Center spider */}
              <TouchableOpacity
                style={styles.webMenuCenter}
                onPress={() => setWebMenuOpen(false)}
              >
                <Svg width={40} height={40} viewBox="0 0 60 60">
                  <Ellipse cx={30} cy={35} rx={7} ry={9} fill="#1a0f00" stroke="#8b6914" strokeWidth={1}/>
                  <Circle cx={30} cy={24} r={6} fill="#1a0f00" stroke="#8b6914" strokeWidth={1}/>
                  <Circle cx={27} cy={23} r={1.5} fill="#c8ff4a"/>
                  <Circle cx={33} cy={23} r={1.5} fill="#c8ff4a"/>
                  <Path d="M 23,27 Q 14,22 10,18" stroke="#3d2200" strokeWidth={1.5} fill="none"/>
                  <Path d="M 23,30 Q 13,29 9,28" stroke="#3d2200" strokeWidth={1.5} fill="none"/>
                  <Path d="M 37,27 Q 46,22 50,18" stroke="#3d2200" strokeWidth={1.5} fill="none"/>
                  <Path d="M 37,30 Q 47,29 51,28" stroke="#3d2200" strokeWidth={1.5} fill="none"/>
                </Svg>
              </TouchableOpacity>

              {/* Nav items at radial positions */}
              {[
                { label: 'לוח ביודינמי', emoji: '📅', screen: 'Calendar', angle: -90 },
                { label: 'יומן גינה',    emoji: '📓', screen: null,       angle: -39 },
                { label: 'משימות',       emoji: '✅', screen: null,       angle: 12  },
                { label: 'מדריכים',      emoji: '📖', screen: 'Guides',   angle: 63  },
                { label: 'הגדרות',       emoji: '⚙️', screen: 'Settings', angle: 114 },
                { label: 'מפת גינה',     emoji: '🗺️', screen: null,       angle: 165 },
                { label: 'מעקב',         emoji: '📊', screen: null,       angle: 216 },
              ].map((item, i) => {
                const rad = item.angle * Math.PI / 180;
                const dist = 105;
                const x = 150 + Math.cos(rad) * dist;
                const y = 150 + Math.sin(rad) * dist;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.webMenuItem, { left: x - 30, top: y - 30 }]}
                    onPress={() => {
                      setWebMenuOpen(false);
                      if (item.screen) navigation.navigate(item.screen);
                    }}
                  >
                    <View style={styles.webMenuIcon}>
                      <Text style={styles.webMenuEmoji}>{item.emoji}</Text>
                    </View>
                    <Text style={styles.webMenuLabel}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Input bar */}
        <View style={styles.inputBar}>
          {/* Mic button — left side */}
          <MicButton
            state={voiceState}
            onPress={handleMicPress}
            disabled={voiceState === 'transcribing' || voiceState === 'thinking' || sending}
          />

          {/* Camera button */}
          <TouchableOpacity
            style={[styles.cameraBtn, (analyzing || sending) && styles.sendDisabled]}
            onPress={handlePhotoAnalysis}
            disabled={analyzing || sending}
          >
            <Text style={styles.cameraIcon}>📷</Text>
          </TouchableOpacity>

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
    width: '100%',
    aspectRatio: 1536 / 1024,
    position: 'relative',
  },
  headImage: {
    width: '100%',
    height: '100%',
  },
  antennaTip: {
    width: 6.45,
    height: 6.45,
    borderRadius: 3.23,
    backgroundColor: '#c8ff4a',
  },
  eyeGlow: {
    width: 13,
    height: 22,
    borderRadius: 6.5,
    backgroundColor: '#ffe8a0',
    position: 'absolute',
    shadowColor: '#ffcc44',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 12,
  },
  leftEye:  {},
  rightEye: {},
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
    color: '#f0e8d0',
    textAlign: 'center',
  },
  dashCardLabel: {
    fontSize: 10,
    color: '#8ab89a',
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
  bubbleTextChupchu: { color: '#d4ecd8' },
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
  cameraBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0d2010',
    borderWidth: 1,
    borderColor: '#1a3d1f',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cameraIcon: { fontSize: 20 },

  // Voice hint
  voiceHint: {
    fontSize: 12,
    color: 'rgba(245,240,232,0.45)',
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: '#07110a',
    writingDirection: 'rtl',
  },

  // Dashboard info modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0d2010',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(196,134,10,0.3)',
    gap: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(196,134,10,0.4)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalContent: { gap: 10 },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e8d4a8',
    textAlign: 'right',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#c4860a',
    textAlign: 'right',
  },
  modalBody: {
    fontSize: 15,
    color: '#a8c4a0',
    textAlign: 'right',
    lineHeight: 24,
  },
  modalClose: {
    backgroundColor: 'rgba(196,134,10,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(196,134,10,0.3)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseText: {
    color: '#c4860a',
    fontSize: 16,
    fontWeight: '600',
  },

  // Sign tap zone (over the spider's sign in the image)
  signTapZone: {
    position: 'absolute',
    top: '35%',
    left: '2%',
    width: '30%',
    height: '22%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  signText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2d1a00',
    textAlign: 'center',
    fontFamily: 'System',
  },
  // Wide tap zone covering the whole web area
  webTapZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '45%',
    height: '80%',
    zIndex: 9,
  },

  // Spider web navigation modal
  webMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMenuContainer: {
    width: 300,
    height: 300,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMenuCenter: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0d2010',
    borderWidth: 1,
    borderColor: 'rgba(196,134,10,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  webMenuItem: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  webMenuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0d2010',
    borderWidth: 1,
    borderColor: 'rgba(196,134,10,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMenuEmoji: { fontSize: 20 },
  webMenuLabel: {
    fontSize: 9,
    color: '#e8d4a8',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  // Photo action card
  actionCard: {
    marginHorizontal: 14,
    marginVertical: 8,
    backgroundColor: '#0d2010',
    borderWidth: 1,
    borderColor: 'rgba(196,134,10,0.3)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e8d4a8',
    textAlign: 'right',
  },
  actionCardButtons: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(74,124,63,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(74,124,63,0.4)',
    borderRadius: 10,
    paddingVertical: 10,
  },
  actionBtnTrack: {
    backgroundColor: 'rgba(196,134,10,0.15)',
    borderColor: 'rgba(196,134,10,0.3)',
  },
  actionBtnIcon: { fontSize: 16 },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c8e0c0',
  },
  actionDismiss: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionDismissText: {
    fontSize: 12,
    color: 'rgba(245,240,232,0.35)',
  },
});
