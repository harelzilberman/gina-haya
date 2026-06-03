import { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { PinchGestureHandler } from 'react-native-gesture-handler';
import Svg, { Rect, Circle, Polygon, Text as SvgText } from 'react-native-svg';
import { getToken } from '../services/auth';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MapObject {
  id: string;
  type: string;
  shapeKind: 'polygon' | 'rect' | 'circle';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  points?: [number, number][];
  cx?: number;
  cy?: number;
  radius?: number;
  label: string;
  z?: number;
}

interface PlantMarker {
  id: string;
  plantNameHe: string;
  plantNameEn: string;
  emoji: string;
  x: number;
  y: number;
  spacing: number;
  notes?: string;
}

interface MapData {
  objects: MapObject[];
  plants: PlantMarker[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PX = 50; // pixels per meter
const CANVAS_W = 2000;
const CANVAS_H = 1600;

const SHAPE_COLORS: Record<string, { fill: string; stroke: string }> = {
  'bed':            { fill: 'rgba(74,156,104,0.35)',   stroke: '#4a9c68' },
  'raised-bed':     { fill: 'rgba(139,90,43,0.35)',    stroke: '#8b5a2b' },
  'pot-rect':       { fill: 'rgba(180,100,40,0.45)',   stroke: '#b46428' },
  'pot-round':      { fill: 'rgba(180,100,40,0.45)',   stroke: '#b46428' },
  'house':          { fill: 'rgba(200,180,140,0.4)',   stroke: '#8b7355' },
  'fence':          { fill: 'transparent',             stroke: '#8b7355' },
  'wall':           { fill: 'rgba(150,130,100,0.5)',   stroke: '#6b5a3e' },
  'fruit-tree':     { fill: 'rgba(100,180,80,0.3)',    stroke: '#4a8c30' },
  'tree':           { fill: 'rgba(80,160,60,0.3)',     stroke: '#3a7c20' },
  'walkway':        { fill: 'rgba(200,180,140,0.3)',   stroke: '#a09070' },
  'lawn':           { fill: 'rgba(120,200,80,0.2)',    stroke: '#70c040' },
  'water-source':   { fill: 'rgba(80,160,220,0.4)',    stroke: '#4090d0' },
  'compost':        { fill: 'rgba(100,80,40,0.4)',     stroke: '#604820' },
  'hydroponics':    { fill: 'rgba(80,180,220,0.3)',    stroke: '#40a0d0' },
  'aquaponics':     { fill: 'rgba(60,140,200,0.3)',    stroke: '#2e86ab' },
  'vertical':       { fill: 'rgba(80,180,100,0.2)',    stroke: '#4a9c68' },
  'pergola':        { fill: 'transparent',             stroke: '#8b7355' },
  'deadzone':       { fill: 'rgba(100,100,100,0.2)',   stroke: '#666666' },
  'tool-shed':      { fill: 'rgba(130,100,70,0.4)',    stroke: '#7a5a3a' },
  'gate':           { fill: 'rgba(180,140,60,0.3)',    stroke: '#c49a2a' },
  'sun-indicator':  { fill: 'rgba(0,229,195,0.08)',    stroke: '#00e5c3' },
};

// ── Component ──────────────────────────────────────────────────────────────────

export function GardenMapScreen() {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<PlantMarker | null>(null);
  const [scale, setScale] = useState(1);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadMap();
  }, []);

  const loadMap = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        'https://powerful-embrace-production-95ea.up.railway.app/api/map',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!data.exists) {
        setMapData(null);
      } else {
        setMapData(data.map_data ?? { objects: [], plants: [] });
      }
    } catch (err: any) {
      setError(err.message ?? 'שגיאה בטעינת המפה');
      console.error('[GardenMapScreen] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlantPress = (plant: PlantMarker) => {
    setSelectedPlant(plant);
  };

  const handlePinch = (event: any) => {
    const newScale = Math.max(0.3, Math.min(4, scale * event.nativeEvent.scale));
    setScale(newScale);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>מפת הגינה 🗺️</Text>
        <Text style={styles.subtitle}>גלול וצבוט לזום</Text>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#c4860a" />
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadMap}>
            <Text style={styles.retryButtonText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty state */}
      {!loading && !error && mapData && mapData.objects.length === 0 && (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>אין מפת גינה עדיין</Text>
          <Text style={styles.emptySubtitle}>צור מפה באתר gina-haya.com</Text>
        </View>
      )}

      {/* Map canvas */}
      {!loading && !error && mapData && mapData.objects.length > 0 && (
        <PinchGestureHandler onGestureEvent={handlePinch}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            scrollEnabled
            contentContainerStyle={{ flexGrow: 1 }}
            style={styles.mapContainer}
          >
            <ScrollView
              scrollEnabled
              contentContainerStyle={{ flexGrow: 1, alignItems: 'flex-start' }}
            >
              <Svg
                width={CANVAS_W * scale}
                height={CANVAS_H * scale}
                viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                style={styles.svg}
              >
                {/* Background */}
                <Rect
                  x={0}
                  y={0}
                  width={CANVAS_W}
                  height={CANVAS_H}
                  fill="#1a2e1a"
                />

                {/* Grid lines every 250px (5m) */}
                {Array.from({ length: Math.ceil(CANVAS_W / 250) + 1 }).map((_, i) => (
                  <line
                    key={`vgrid-${i}`}
                    x1={i * 250}
                    y1={0}
                    x2={i * 250}
                    y2={CANVAS_H}
                    stroke={i % 2 === 0 ? 'rgba(74,156,104,0.15)' : 'rgba(74,156,104,0.08)'}
                    strokeWidth={i % 2 === 0 ? 1.5 : 0.75}
                  />
                ))}
                {Array.from({ length: Math.ceil(CANVAS_H / 250) + 1 }).map((_, i) => (
                  <line
                    key={`hgrid-${i}`}
                    x1={0}
                    y1={i * 250}
                    x2={CANVAS_W}
                    y2={i * 250}
                    stroke={i % 2 === 0 ? 'rgba(74,156,104,0.15)' : 'rgba(74,156,104,0.08)'}
                    strokeWidth={i % 2 === 0 ? 1.5 : 0.75}
                  />
                ))}

                {/* Objects sorted by z-index */}
                {mapData.objects
                  .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
                  .map((obj) => renderMapObject(obj))}

                {/* Plants */}
                {mapData.plants.map((plant) => (
                  <TouchableOpacity
                    key={plant.id}
                    onPress={() => handlePlantPress(plant)}
                    activeOpacity={0.7}
                  >
                    <SvgText
                      x={plant.x * PX}
                      y={plant.y * PX}
                      fontSize={20}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {plant.emoji}
                    </SvgText>
                  </TouchableOpacity>
                ))}
              </Svg>
            </ScrollView>
          </ScrollView>
        </PinchGestureHandler>
      )}

      {/* Plant detail modal */}
      {selectedPlant && (
        <Modal
          visible={!!selectedPlant}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPlant(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalEmoji}>{selectedPlant.emoji}</Text>
              <Text style={styles.modalTitle}>{selectedPlant.plantNameHe}</Text>
              <Text style={styles.modalSubtitle}>{selectedPlant.plantNameEn}</Text>

              <View style={styles.modalInfo}>
                <Text style={styles.infoLabel}>מרווח בין צמחים:</Text>
                <Text style={styles.infoValue}>{selectedPlant.spacing} ס"מ</Text>
              </View>

              {selectedPlant.notes && (
                <View style={styles.modalInfo}>
                  <Text style={styles.infoLabel}>הערות:</Text>
                  <Text style={styles.infoValue}>{selectedPlant.notes}</Text>
                </View>
              )}

              <View style={styles.modalInfo}>
                <Text style={styles.infoLabel}>מיקום:</Text>
                <Text style={styles.infoValue}>
                  x: {selectedPlant.x.toFixed(2)}מ׳, y: {selectedPlant.y.toFixed(2)}מ׳
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSelectedPlant(null)}
              >
                <Text style={styles.modalCloseText}>סגור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ── Helper: Render MapObject ───────────────────────────────────────────────────

function renderMapObject(obj: MapObject) {
  const colors = SHAPE_COLORS[obj.type] || { fill: 'rgba(100,100,100,0.3)', stroke: '#666' };

  if (obj.shapeKind === 'rect' && obj.x !== undefined && obj.y !== undefined && obj.width && obj.height) {
    const x = obj.x * PX;
    const y = obj.y * PX;
    const width = obj.width * PX;
    const height = obj.height * PX;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rotation = obj.rotation ?? 0;

    return (
      <View key={obj.id}>
        {/* Rect with rotation */}
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={1}
          transform={rotation ? `rotate(${rotation} ${cx} ${cy})` : undefined}
        />
        {/* Label text */}
        <SvgText
          x={cx}
          y={cy}
          fontSize={12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#f5f0e8"
          opacity={0.7}
        >
          {obj.label}
        </SvgText>
      </View>
    );
  }

  if (obj.shapeKind === 'circle' && obj.cx !== undefined && obj.cy !== undefined && obj.radius) {
    const cx = obj.cx * PX;
    const cy = obj.cy * PX;
    const r = obj.radius * PX;

    return (
      <View key={obj.id}>
        <Circle cx={cx} cy={cy} r={r} fill={colors.fill} stroke={colors.stroke} strokeWidth={1} />
        <SvgText
          x={cx}
          y={cy}
          fontSize={12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#f5f0e8"
          opacity={0.7}
        >
          {obj.label}
        </SvgText>
      </View>
    );
  }

  if (obj.shapeKind === 'polygon' && obj.points && obj.points.length > 0) {
    const pointsStr = obj.points.map(([x, y]) => `${x * PX},${y * PX}`).join(' ');
    const centroid = obj.points.reduce(
      ([sx, sy], [x, y]) => [sx + x, sy + y],
      [0, 0]
    );
    const cx = (centroid[0] / obj.points.length) * PX;
    const cy = (centroid[1] / obj.points.length) * PX;

    return (
      <View key={obj.id}>
        <Polygon
          points={pointsStr}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={1}
        />
        <SvgText
          x={cx}
          y={cy}
          fontSize={12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#f5f0e8"
          opacity={0.7}
        >
          {obj.label}
        </SvgText>
      </View>
    );
  }

  return null;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#1a1a0e',
  },
  header: {
    backgroundColor: '#060e08',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,156,104,0.2)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#c4860a',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(74,156,104,0.6)',
    textAlign: 'right',
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#1a2e1a',
  },
  svg: {
    alignSelf: 'flex-start',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a0e',
  },
  errorText: {
    color: '#e06060',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: 'rgba(196,134,10,0.2)',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(196,134,10,0.3)',
  },
  retryButtonText: {
    color: '#c4860a',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f5f0e8',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(237,224,196,0.5)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a0e',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    borderWidth: 1,
    borderColor: 'rgba(196,134,10,0.2)',
  },
  modalEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f5f0e8',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: 'rgba(237,224,196,0.6)',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInfo: {
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(196,134,10,0.1)',
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(237,224,196,0.5)',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#f5f0e8',
    fontWeight: '500',
  },
  modalCloseButton: {
    marginTop: 16,
    backgroundColor: 'rgba(196,134,10,0.2)',
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(196,134,10,0.3)',
  },
  modalCloseText: {
    color: '#c4860a',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
