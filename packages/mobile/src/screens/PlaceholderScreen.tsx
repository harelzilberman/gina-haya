import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export function PlaceholderScreen({ name }: { name: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{name}</Text>
      <Text style={styles.sub}>בקרוב...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    writingDirection: 'rtl',
  },
  sub: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
    marginTop: 8,
  },
});
