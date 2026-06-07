import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { supabase } from '../services/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface DashboardCard {
  id: string;
  title: string;
  value: string;
  icon: string;
  color: string;
}

export function ChupChuScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'שלום! מה הגינה שלך צריכה היום?\nצ\'יפ ✦',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${API_URL}/api/calendar/today`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();

      setCards([
        {
          id: '1',
          title: 'סוג היום',
          value: data.dayType ?? '—',
          icon: '🌱',
          color: theme.colors.success,
        },
        {
          id: '2',
          title: 'מזל הירח',
          value: data.moonSign ?? '—',
          icon: '🌙',
          color: theme.colors.accent,
        },
        {
          id: '3',
          title: 'ציון נטיעה',
          value: data.plantingScore ? `${data.plantingScore}/10` : '—',
          icon: '⭐',
          color: theme.colors.warning,
        },
      ]);
    } catch (e) {
      console.log('Calendar fetch error:', e);
    } finally {
      setCardsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${API_URL}/api/chupchu/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error('שגיאה בשרת');
      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response ?? data.message ?? 'צ\'יפ ✦',
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (e: any) {
      Alert.alert('שגיאה', e.message ?? 'נסה שנית');
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isAssistant = item.role === 'assistant';
    return (
      <View style={[
        styles.messageBubble,
        isAssistant ? styles.assistantBubble : styles.userBubble,
      ]}>
        <Text style={[
          styles.messageText,
          isAssistant ? styles.assistantText : styles.userText,
        ]}>
          {item.content}
        </Text>
      </View>
    );
  };

  const renderCard = ({ item }: { item: DashboardCard }) => (
    <View style={[styles.card, { borderColor: item.color }]}>
      <Text style={styles.cardIcon}>{item.icon}</Text>
      <Text style={styles.cardValue}>{item.value}</Text>
      <Text style={styles.cardTitle}>{item.title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={60}
      >
        {/* Chupchu Image */}
        <Image
          source={require('../../assets/chupchu_web_in_hole.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />

        {/* Dashboard Cards */}
        {cardsLoading ? (
          <ActivityIndicator
            color={theme.colors.accent}
            style={{ marginVertical: theme.spacing.sm }}
          />
        ) : (
          <FlatList
            data={cards}
            renderItem={renderCard}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsContainer}
            style={styles.cardsList}
          />
        )}

        {/* Chat */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chatContent}
          style={styles.chatList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        {/* Loading indicator */}
        {loading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.typingText}>צ'ופצ'ו חושב...</Text>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
            disabled={loading || !input.trim()}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="שאל את צ'ופצ'ו..."
            placeholderTextColor={theme.colors.textMuted}
            multiline
            textAlign="right"
            onSubmitEditing={sendMessage}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: 200,
  },
  cardsContainer: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardsList: {
    flexGrow: 0,
    paddingVertical: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
    alignItems: 'center',
    minWidth: 100,
  },
  cardIcon: { fontSize: 24, marginBottom: 4 },
  cardValue: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  cardTitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.xs,
    marginTop: 2,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  chatList: { flex: 1 },
  chatContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
  },
  assistantBubble: {
    backgroundColor: theme.colors.chupchu,
    borderWidth: 1,
    borderColor: theme.colors.chupchuborder,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: theme.colors.user,
    borderWidth: 1,
    borderColor: theme.colors.userBorder,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: theme.fontSize.md,
    lineHeight: 22,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  assistantText: { color: theme.colors.textPrimary },
  userText: { color: theme.colors.textSecondary },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  typingText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    writingDirection: 'rtl',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundAlt,
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    maxHeight: 100,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  sendButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.full,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
