import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MonMessage } from '@gina-haya/shared';
import { sendMonMessage, loadMonHistory } from '../services/mon';
import { MonBubble } from '../components/MonBubble';

export function MonScreen() {
  const [messages,  setMessages]  = useState<MonMessage[]>([]);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMonHistory().then(setMessages);
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
    setError(null);

    const userMsg: MonMessage = {
      role: 'user', content: text, timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      const response = await sendMonMessage(text, messages);
      const monMsg: MonMessage = {
        role: 'assistant', content: response, timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, monMsg]);
    } catch (err: any) {
      setError(err.message ?? 'שגיאה בשליחת ההודעה');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>🌕</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name}>מון לבנה</Text>
            <Text style={styles.subtitle}>המומחה הביודינמי שלך</Text>
          </View>
        </View>

        {/* Message list */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <MonBubble message={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !sending ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyEmoji}>🌱</Text>
                <Text style={styles.emptyText}>שלום! אני מון לבנה.{'\n'}מה קורה בגינה שלך היום?</Text>
              </View>
            ) : null
          }
          style={styles.list}
        />

        {sending && (
          <View style={styles.typingRow}>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color="#c8a84b" />
              <Text style={styles.typingText}>מון חושב...</Text>
            </View>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="שאל את מון..."
            placeholderTextColor="rgba(237,224,196,0.3)"
            multiline
            textAlign="right"
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

        <Text style={styles.disclaimer}>
          עצות מון הן לצורך מידע בלבד. לבעיות חמורות, פנה למומחה גידול.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a3a2a' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,168,75,0.1)',
    backgroundColor: 'rgba(15,34,18,0.9)',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#c8a84b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 22 },
  headerText: { alignItems: 'flex-end' },
  name: { fontSize: 17, fontWeight: '700', color: '#c8a84b' },
  subtitle: { fontSize: 12, color: 'rgba(237,224,196,0.5)', marginTop: 1 },
  list: { flex: 1 },
  listContent: {
    padding: 14,
    gap: 2,
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyEmoji: { fontSize: 42 },
  emptyText: {
    fontSize: 15,
    color: 'rgba(237,224,196,0.6)',
    textAlign: 'center',
    lineHeight: 24,
  },
  typingRow: {
    paddingHorizontal: 14,
    paddingBottom: 4,
    alignItems: 'flex-end',
  },
  typingBubble: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(28,58,30,0.8)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 13,
    color: 'rgba(237,224,196,0.55)',
    fontStyle: 'italic',
  },
  errorText: {
    color: '#E06060',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  inputBar: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: 10,
    margin: 12,
    backgroundColor: 'rgba(28,58,30,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(125,192,132,0.2)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#EDE0C4',
    maxHeight: 110,
    writingDirection: 'rtl',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#c8a84b',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendDisabled: { opacity: 0.35 },
  sendArrow: { fontSize: 18, color: '#1a3a2a', fontWeight: '700' },
  disclaimer: {
    fontSize: 11,
    color: 'rgba(237,224,196,0.25)',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
