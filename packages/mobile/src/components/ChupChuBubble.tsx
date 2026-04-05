import { View, Text, StyleSheet } from 'react-native';
import type { ChupChuMessage } from '@gina-haya/shared';

interface Props {
  message: ChupChuMessage;
}

export function ChupChuBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowChupChu]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>🌕</Text>
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser ? styles.bubbleUser : styles.bubbleChupChu,
      ]}>
        <Text style={[styles.text, isUser ? styles.textUser : styles.textChupChu]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 10,
  },
  rowUser: {
    // User messages: right-aligned in RTL → flex-start with row-reverse
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  rowChupChu: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#c8a84b',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarEmoji: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: 'rgba(74,128,80,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(125,192,132,0.2)',
    borderTopRightRadius: 4,
  },
  bubbleChupChu: {
    backgroundColor: 'rgba(28,58,30,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(200,168,75,0.15)',
    borderTopLeftRadius: 4,
    borderRightWidth: 2,
    borderRightColor: '#c8a84b',
  },
  text: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  textUser: {
    color: '#EDE0C4',
  },
  textChupChu: {
    color: '#EDE0C4',
    fontStyle: 'italic',
  },
});
