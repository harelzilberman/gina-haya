import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

interface Props {
  task:      string;
  checked:   boolean;
  onToggle:  () => void;
}

export function TaskCard({ task, checked, onToggle }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.label, checked && styles.labelChecked]}>
        {task}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(28,58,30,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(200,168,75,0.15)',
    borderRadius: 10,
    padding: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(200,168,75,0.5)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#c8a84b',
    borderColor: '#c8a84b',
  },
  checkmark: {
    fontSize: 13,
    color: '#1a3a2a',
    fontWeight: '700',
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: '#EDE0C4',
    textAlign: 'right',
  },
  labelChecked: {
    opacity: 0.45,
    textDecorationLine: 'line-through',
  },
});
