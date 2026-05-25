import { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View } from 'react-native';
import { Text } from 'react-native';

type VoiceState = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking';

const STATE_ICONS: Record<VoiceState, string> = {
  idle:         '🎙️',
  recording:    '⏹',
  transcribing: '✦',
  thinking:     '✦',
  speaking:     '🔊',
};

const STATE_COLORS: Record<VoiceState, string> = {
  idle:         '#c4860a',
  recording:    '#e05050',
  transcribing: '#6a9a6a',
  thinking:     '#6a9a6a',
  speaking:     '#4a7c3f',
};

interface Props {
  state: VoiceState;
  onPress: () => void;
  disabled?: boolean;
}

export function MicButton({ state, onPress, disabled }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'idle') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 1200, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else if (state === 'recording') {
      const flash = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.96, duration: 400, useNativeDriver: true }),
        ])
      );
      flash.start();
      return () => flash.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state]);

  const color = STATE_COLORS[state];

  return (
    <View style={styles.wrapper}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.ring,
          { borderColor: color, transform: [{ scale: pulseAnim }] },
        ]}
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: color }]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>{STATE_ICONS[state]}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 2,
    opacity: 0.45,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#c4860a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  icon: {
    fontSize: 32,
  },
});
