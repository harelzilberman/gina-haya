import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert, Dimensions, Modal,
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

const CARD_INFO: Record<string, { title: string; description: string; tips: string[] }> = {
  'ציון נטיעה': {
    title: 'ציון נטיעה',
    description: 'ציון ביודינמי לאיכות היום לנטיעה, השתלה ועבודת אדמה. הציון מחושב לפי מיקום הירח במזל, שלב הירח ועוד גורמים.',
    tips: [
      '8-10: יום מצוין לנטיעה',
      '5-7: יום טוב, אפשר לעבוד',
      '1-4: עדיף להמנע מנטיעה',
    ],
  },
  'מזל הירח': {
    title: 'מזל הירח',
    description: 'המזל שבו שוהה הירח היום. לכל מזל השפעה שונה על הגינה.',
    tips: [
      'טלה, אריה, קשת: ימי פרי',
      'שור, בתולה, גדי: ימי שורש',
      'תאומים, מאזניים, דלי: ימי פרח',
      'סרטן, עקרב, דגים: ימי עלה',
    ],
  },
  'סוג היום': {
    title: 'סוג היום הביודינמי',
    description: 'בחקלאות ביודינמית, כל יום מסווג לפי מיקום הירח: ימי פרי, עלה, שורש או פרח. לכל סוג יום מומלצת עבודה שונה.',
    tips: [
      'פרי 🍎: קטיף, שתיית מיצים, ייבוש פירות',
      'פרח 🌸: קטיף פרחים, ייבוש עשבי תיבול',
      'עלה 🌿: השקיה, דישון, עבודה עם עלים',
      'שורש 🥕: חפירה, קטיף ירקות שורש',
    ],
  },
};

const TRANSLATIONS: Record<string, string> = {
  // Moon signs
  'Aries': 'טלה', 'Taurus': 'שור', 'Gemini': 'תאומים',
  'Cancer': 'סרטן', 'Leo': 'אריה', 'Virgo': 'בתולה',
  'Libra': 'מאזניים', 'Scorpio': 'עקרב', 'Sagittarius': 'קשת',
  'Capricorn': 'גדי', 'Aquarius': 'דלי', 'Pisces': 'דגים',
  // Day types
  'fruit': 'פרי', 'flower': 'פרח', 'leaf': 'עלה',
  'root': 'שורש', 'unfavorable': 'לא מומלץ',
};

const translate = (value: string) => TRANSLATIONS[value] ?? value;

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
  const [selectedCard, setSelectedCard] = useState<DashboardCard | null>(null);
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
          value: translate(data.dayType ?? '—'),
          icon: '🌱',
          color: theme.colors.success,
        },
        {
          id: '2',
          title: 'מזל הירח',
          value: translate(data.moonSign ?? '—'),
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
    <TouchableOpacity
      key={item.id}
      style={[styles.card, { borderColor: item.color }]}
      onPress={() => setSelectedCard(item)}
      activeOpacity={0.8}
    >
      <Text style={styles.cardIcon}>{item.icon}</Text>
      <Text style={[styles.cardValue, { color: item.color }]}>{item.value}</Text>
      <Text style={styles.cardTitle}>{item.title}</Text>
    </TouchableOpacity>
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
          <View style={styles.cardsRow}>
            {cards.map(item => renderCard({ item }))}
          </View>
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

      <Modal
        visible={!!selectedCard}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCard(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedCard(null)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={() => {}}
          >
            {selectedCard && (() => {
              const info = CARD_INFO[selectedCard.title];
              return (
                <>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setSelectedCard(null)}>
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>{selectedCard.icon} {selectedCard.value}</Text>
                  </View>
                  <Text style={styles.modalSubtitle}>{info?.title ?? selectedCard.title}</Text>
                  <Text style={styles.modalDesc}>{info?.description ?? ''}</Text>
                  {info?.tips && (
                    <View style={styles.modalTips}>
                      {info.tips.map((tip, i) => (
                        <View key={i} style={styles.modalTipRow}>
                          <Text style={styles.modalTipBullet}>•</Text>
                          <Text style={styles.modalTipText}>{tip}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    width: '100%',
    direction: 'rtl',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
  },
  modalClose: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.lg,
    padding: theme.spacing.sm,
  },
  modalSubtitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: theme.spacing.sm,
    writingDirection: 'rtl',
  },
  modalDesc: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 24,
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  modalTips: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    width: '100%',
  },
  modalTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  modalTipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 22,
    flex: 1,
  },
  modalTipBullet: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
    lineHeight: 22,
  },
});
