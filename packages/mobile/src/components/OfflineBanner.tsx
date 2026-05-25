import { View, Text, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
}

export function OfflineBanner({ visible }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>אין חיבור לאינטרנט — מציג נתונים שמורים</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(180,100,20,0.85)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
