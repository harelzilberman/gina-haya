import { ScrollView, Text, View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const GUIDES = [
  { emoji: '🌿', title: 'תה קומפוסט', subtitle: 'המדריך המלא לאדמה חיה', url: 'https://gina-haya.com/articles/compost-tea' },
  { emoji: '🛢️', title: 'שמן נים', subtitle: 'נשק סודי נגד מזיקים', url: 'https://gina-haya.com/articles/neem-oil' },
  { emoji: '🌱', title: 'דשן ירוק', subtitle: 'להאכיל את הקרקע לפני הצמח', url: 'https://gina-haya.com/articles/green-manure' },
  { emoji: '🌊', title: 'ריסוס אצות ים', subtitle: 'כוח הים בגינה', url: 'https://gina-haya.com/articles/seaweed-spray' },
  { emoji: '🪨', title: 'חיפוי קרקע', subtitle: 'חיסכון במים והפחתת עשביה', url: 'https://gina-haya.com/articles/ground-mulching' },
  { emoji: '💧', title: 'השקיית עציצים', subtitle: 'המדריך המקצועי', url: 'https://gina-haya.com/articles/watering-pots' },
  { emoji: '🍂', title: 'סימני סטרס', subtitle: 'מה הגינה מנסה לספר לך', url: 'https://gina-haya.com/articles/plant-stress-signs' },
];

const PREPS = [
  { key: '500', label: 'פרפרט 500 — גיר', desc: 'לאדמה ושורשים', url: 'https://gina-haya.com/articles/bd-500' },
  { key: '501', label: 'פרפרט 501 — צורן', desc: 'לאור ופירות', url: 'https://gina-haya.com/articles/bd-501' },
  { key: '508', label: 'פרפרט 508 — שבטבט', desc: 'נגד פטריות ומחלות', url: 'https://gina-haya.com/articles/bd-508' },
];

export function GuidesScreen() {
  const openArticle = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>מדריכים</Text>

        <Text style={styles.section}>מאמרי גינון</Text>
        {GUIDES.map(g => (
          <TouchableOpacity
            key={g.url}
            style={styles.card}
            onPress={() => openArticle(g.url)}
            activeOpacity={0.75}
          >
            <Text style={styles.cardEmoji}>{g.emoji}</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{g.title}</Text>
              <Text style={styles.cardSub}>{g.subtitle}</Text>
            </View>
            <Text style={styles.arrow}>←</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.section}>פרפרטים ביודינמיים</Text>
        {PREPS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.card, styles.prepCard]}
            onPress={() => openArticle(p.url)}
            activeOpacity={0.75}
          >
            <Text style={styles.prepNum}>{p.key}</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{p.label}</Text>
              <Text style={styles.cardSub}>{p.desc}</Text>
            </View>
            <Text style={styles.arrow}>←</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1a1a0e' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  title: {
    fontSize: 28, fontWeight: '700', color: '#c4860a',
    textAlign: 'right', marginBottom: 8,
  },
  section: {
    fontSize: 13, fontWeight: '600',
    color: 'rgba(245,240,232,0.45)',
    textAlign: 'right', marginTop: 6, marginBottom: 2,
  },
  card: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(196,134,10,0.12)',
  },
  prepCard: { borderColor: 'rgba(74,124,63,0.2)' },
  cardEmoji: { fontSize: 28, width: 38, textAlign: 'center' },
  prepNum: {
    width: 38, textAlign: 'center',
    fontSize: 16, fontWeight: '800', color: '#c4860a',
  },
  cardText: { flex: 1, alignItems: 'flex-end' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#f5f0e8', textAlign: 'right' },
  cardSub: { fontSize: 12, color: 'rgba(245,240,232,0.5)', textAlign: 'right', marginTop: 2 },
  arrow: { fontSize: 16, color: 'rgba(196,134,10,0.5)' },
});
