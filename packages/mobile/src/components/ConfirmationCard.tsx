import { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Animated, Pressable, ActivityIndicator,
} from 'react-native';

interface Props {
  visible: boolean;
  descriptionHe: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationCard({ visible, descriptionHe, loading, onConfirm, onCancel }: Props) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Animated.View
          style={[styles.card, { transform: [{ translateY: slideAnim }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} />

          <Text style={styles.description}>{descriptionHe}</Text>

          <TouchableOpacity
            style={[styles.confirmBtn, loading && styles.btnDisabled]}
            onPress={onConfirm}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#1a1a0e" />
              : <Text style={styles.confirmText}>✓ אישור</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
            <Text style={styles.cancelText}>✕ ביטול</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#2a2a18',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(196,134,10,0.25)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(245,240,232,0.25)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 18,
    color: '#f5f0e8',
    textAlign: 'right',
    lineHeight: 28,
    fontWeight: '500',
  },
  confirmBtn: {
    backgroundColor: '#4a7c3f',
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    color: '#f5f0e8',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    color: 'rgba(245,240,232,0.45)',
    fontSize: 15,
  },
});
