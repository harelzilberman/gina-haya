// Small illustrations shown under each plant card, keyed by garden_plants.location_type.
// Mirrors the app's garden_screen.dart _plantingBase() painters (pot / open field / growing
// bed / hydroponic trough / greenhouse) — kept as simple inline SVG here instead of canvas painters.

export const LOCATION_TYPES = [
  { value: 'pot',        labelHe: 'עציץ',  emoji: '🪴' },
  { value: 'garden',     labelHe: 'גינה',  emoji: '🌿' },
  { value: 'bed',        labelHe: 'ערוגה', emoji: '🟫' },
  { value: 'hydroponic', labelHe: 'הידרופוני', emoji: '💧' },
  { value: 'greenhouse', labelHe: 'חממה', emoji: '🏡' },
] as const;

export type LocationType = typeof LOCATION_TYPES[number]['value'];

export function locationLabel(value: string | null | undefined): string {
  return LOCATION_TYPES.find(l => l.value === value)?.labelHe ?? 'עציץ';
}

interface Props {
  type: string | null | undefined;
  width?: number;
  height?: number;
}

export function PlantingBase({ type, width = 64, height = 26 }: Props) {
  const t = type ?? 'pot';

  if (t === 'garden') {
    return (
      <svg width={width} height={height} viewBox="0 0 64 26" aria-hidden="true">
        <path d="M0 20 Q16 8 32 16 T64 18 V26 H0 Z" fill="#3E7B4F" />
        <path d="M0 22 Q16 16 32 20 T64 22" stroke="#2E5C3A" strokeWidth="1.2" fill="none" opacity="0.6" />
        <circle cx="52" cy="6" r="4" fill="#E6C24A" opacity="0.8" />
      </svg>
    );
  }

  if (t === 'bed') {
    return (
      <svg width={width} height={height} viewBox="0 0 64 26" aria-hidden="true">
        <rect x="2" y="14" width="60" height="10" rx="2" fill="#6B4423" />
        <rect x="2" y="14" width="60" height="3" fill="#8B5A2B" />
        {[14, 32, 50].map(x => (
          <g key={x}>
            <line x1={x} y1="14" x2={x} y2="6" stroke="#4A9C68" strokeWidth="2" strokeLinecap="round" />
            <circle cx={x} cy="5" r="3.5" fill="#4A9C68" />
          </g>
        ))}
      </svg>
    );
  }

  if (t === 'hydroponic') {
    return (
      <svg width={width} height={height} viewBox="0 0 64 26" aria-hidden="true">
        <rect x="4" y="14" width="56" height="4" fill="#4AADE8" />
        <rect x="4" y="17" width="56" height="8" rx="2" fill="#1A7AC0" />
        {[16, 32, 48].map(x => (
          <line key={x} x1={x} y1="14" x2={x} y2="4" stroke="#4A9C68" strokeWidth="2" strokeLinecap="round" />
        ))}
      </svg>
    );
  }

  if (t === 'greenhouse') {
    return (
      <svg width={width} height={height} viewBox="0 0 64 26" aria-hidden="true">
        <path d="M4 16 Q32 2 60 16 V24 H4 Z" fill="rgba(160,220,255,0.28)" stroke="#8FBAD6" strokeWidth="1.2" />
        <line x1="32" y1="3" x2="32" y2="24" stroke="#8FBAD6" strokeWidth="1" opacity="0.7" />
        <rect x="28" y="18" width="8" height="6" fill="#6B4423" />
        <rect x="4" y="22" width="56" height="2" fill="#4A9C68" opacity="0.5" />
      </svg>
    );
  }

  // pot (default)
  return (
    <svg width={width} height={height} viewBox="0 0 64 26" aria-hidden="true">
      <rect x="18" y="6" width="28" height="4" rx="1.5" fill="#A0522D" />
      <path d="M20 10 L44 10 L40 24 H24 Z" fill="#8B4513" />
    </svg>
  );
}
