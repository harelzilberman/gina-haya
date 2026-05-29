import { useEffect, useRef, useState } from 'react';
import {
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
import { sendChupChuMessage, loadChupChuHistory } from '../services/chupchu';

interface Message {
  id: string;
  role: 'chupchu' | 'user';
  text: string;
  timestamp: Date;
}

const GREETING = 'בוקר-בוקר טוב! מה הגינה שלך צריכה היום?\nצ\'יפ ✦';

function useEyeGlow(offsetMs: number) {
  const opacity = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    const delay = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.2, duration: 1200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.95, duration: 1000, useNativeDriver: true }),
        ]),
      ).start();
    }, offsetMs);
    return () => clearTimeout(delay);
  }, [opacity, offsetMs]);
  return opacity;
}

function useAntennaPulse(offsetMs: number) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const delay = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 0.6, duration: 800, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      ).start();
    }, offsetMs);
    return () => clearTimeout(delay);
  }, [scale, offsetMs]);
  return scale;
}

function useBlink() {
  const scaleY = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = () => {
      const timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(scaleY, { toValue: 0.05, duration: 80, useNativeDriver: true }),
          Animated.timing(scaleY, { toValue: 1, duration: 80, useNativeDriver: true }),
        ]).start(() => loop());
      }, 4000 + Math.random() * 2000);
      return timer;
    };
    const t = loop();
    return () => clearTimeout(t);
  }, [scaleY]);
  return scaleY;
}

function ChupChuHead() {
  const leftEye = useEyeGlow(0);
  const rightEye = useEyeGlow(600);
  const leftAntenna = useAntennaPulse(0);
  const rightAntenna = useAntennaPulse(1600);
  const blinkScaleY = useBlink();

  return (
    <View style={styles.headSection}>
      {/* Antenna tips */}
      <View style={styles.antennaRow}>
        <Animated.View style={[styles.antennaTip, { transform: [{ scale: leftAntenna }] }]} />
        <View style={styles.antennaGap} />
        <Animated.View style={[styles.antennaTip, { transform: [{ scale: rightAntenna }] }]} />
      </View>

      {/* Circular image with eye overlays */}
      <View style={styles.imageWrap}>
        <Animated.View style={[styles.imageContainer, { transform: [{ scaleY: blinkScaleY }] }]}>
          <Image
            source={require('../assets/chupchu_head.jpg')}
            style={styles.headImage}
          />
        </Animated.View>

        {/* Left eye glow */}
        <Animated.View style={[styles.eyeGlow, styles.leftEye, { opacity: leftEye }]} />
        {/* Right eye glow */}
        <Animated.View style={[styles.eyeGlow, styles.rightEye, { opacity: rightEye }]} />
      </View>

      <Text style={styles.headName}>צ'ופצ'ו ✦</Text>
      <Text style={styles.headSubtitle}>מוכן לעזור לגינה שלך</Text>
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
          Animated.timing(val, { toValue: 0, duration: 300, useNativeDriver: true }),
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

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const initial: Message = {
      id: 'greeting',
      role: 'chupchu',
      text: GREETING,
      timestamp: new Date(),
    };
    loadChupChuHistory().then(history => {
      if (history.length > 0) {
        setMessages(
          history.map((m, i) => ({
            id: String(i),
            role: m.role === 'user' ? 'user' : 'chupchu',
            text: m.role === 'assistant' ? `${m.content}\nצ'יפ ✦` : m.content,
            timestamp: new Date(m.timestamp),
          })),
        );
      } else {
        setMessages([initial]);
      }
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      const result = await sendChupChuMessage(text, []);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'chupchu',
        text: `${result.response}\nצ'יפ ✦`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'chupchu',
        text: "צ'יפ... משהו השתבש, נסה שוב",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>צ'ופצ'ו 💬</Text>
          <Text style={styles.headerSub}>שומר הגינה הביודינמית</Text>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<ChupChuHead />}
          ListFooterComponent={sending ? <TypingIndicator /> : null}
          style={styles.list}
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
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
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || sending) && styles.sendDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <Text style={styles.sendArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#060e08' },
  flex: { flex: 1 },

  header: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0d2010',
    backgroundColor: '#060e08',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f5a623',
    writingDirection: 'rtl',
  },
  headerSub: {
    fontSize: 12,
    color: '#2d5035',
    marginTop: 2,
    writingDirection: 'rtl',
  },

  list: { flex: 1 },
  listContent: { paddingBottom: 12 },

  headSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  antennaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  antennaTip: {
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
  antennaGap: { width: 80 },
  imageWrap: {
    width: 124,
    height: 124,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#1a3d1f',
  },
  headImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  eyeGlow: {
    position: 'absolute',
    width: 18,
    height: 10,
    borderRadius: 9,
    backgroundColor: '#f5a623',
  },
  leftEye: { top: 46, left: 22 },
  rightEye: { top: 46, right: 22 },
  headName: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#e8d4a8',
    writingDirection: 'rtl',
  },
  headSubtitle: {
    fontSize: 13,
    color: '#2d5035',
    marginTop: 4,
    writingDirection: 'rtl',
  },

  bubbleRow: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  bubbleRowChupchu: { alignItems: 'flex-end' },
  bubbleRowUser: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%',
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
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 14,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  bubbleTextChupchu: { color: '#d4c49a' },
  bubbleTextUser: { color: '#b8d4be' },

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

  inputBar: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: '#07110a',
    borderTopWidth: 1,
    borderTopColor: '#0d2010',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#c8d4c0',
    maxHeight: 110,
    writingDirection: 'rtl',
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
});
