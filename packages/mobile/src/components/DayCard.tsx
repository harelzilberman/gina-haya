import { View, Text, StyleSheet } from 'react-native';
import type { BiodynamicDay } from '@gina-haya/shared';

interface Props {
  day: BiodynamicDay;
}

const SCORE_COLORS: Record<string, string> = {
  green:  '#2d8a4e',
  yellow: '#c8a84b',
  orange: '#c86828',
  red:    '#c83838',
  black:  '#555555',
};

const DAY_TYPE_EMOJI: Record<string, string> = {
  fruit:  '🍎',
  root:   '🥕',
  flower: '🌸',
  leaf:   '🌿',
};

export function DayCard({ day }: Props) {
  const scoreColor = SCORE_COLORS[day.scoreColour] ?? '#c8a84b';
  const emoji      = DAY_TYPE_EMOJI[day.dayType] ?? '🌿';
  const dirArrow   = day.ascendingDescending === 'ascending' ? '↑' : '↓';
  const dirLabel   = day.ascendingDescendingHe;

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.row}>
        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          {day.nodeActive
            ? <Text style={styles.nodeIcon}>⚫</Text>
            : <Text style={[styles.scoreText, { color: scoreColor }]}>{day.plantingScore}</Text>
          }
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.moonPhase}>{day.moonPhaseNameHe}</Text>
          <Text style={styles.direction}>{dirArrow} {dirLabel}</Text>
        </View>
      </View>

      {/* Day type */}
      <View style={styles.dayTypeRow}>
        <Text style={styles.dayTypeEmoji}>{emoji}</Text>
        <Text style={styles.dayTypeName}>{day.dayTypeHe}</Text>
        {day.nodeActive && (
          <Text style={styles.nodeLabel}> — יום צומת</Text>
        )}
      </View>

      {/* BD prep badges */}
      {(day.prep500Recommended || day.prep501Recommended) && (
        <View style={styles.badgeRow}>
          {day.prep500Recommended && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>פרפרט 500 ✓</Text>
            </View>
          )}
          {day.prep501Recommended && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>פרפרט 501 ✓</Text>
            </View>
          )}
        </View>
      )}

      {/* Moon sign */}
      <Text style={styles.moonSign}>מזל: {day.moonSignHe}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(28,58,30,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(200,168,75,0.2)',
    borderRadius: 14,
    padding: 18,
    gap: 12,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  scoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 22,
    fontWeight: '700',
  },
  nodeIcon: {
    fontSize: 22,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  moonPhase: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EDE0C4',
  },
  direction: {
    fontSize: 13,
    color: 'rgba(237,224,196,0.6)',
    marginTop: 2,
  },
  dayTypeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  dayTypeEmoji: {
    fontSize: 20,
  },
  dayTypeName: {
    fontSize: 16,
    color: '#EDE0C4',
    fontWeight: '500',
  },
  nodeLabel: {
    fontSize: 13,
    color: '#E06060',
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  badge: {
    backgroundColor: 'rgba(45,110,62,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(45,110,62,0.6)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    color: '#7DC084',
    fontWeight: '600',
  },
  moonSign: {
    fontSize: 13,
    color: 'rgba(237,224,196,0.55)',
    textAlign: 'right',
  },
});
