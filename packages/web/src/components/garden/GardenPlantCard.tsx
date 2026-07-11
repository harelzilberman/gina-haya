import type { GardenPlant } from '../../stores/gardenStore';
import type { Tracker } from '../../stores/trackerStore';
import { PlantingBase } from './PlantingBase';

const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const PLANT_TYPE_EMOJI: Record<string, string> = {
  tree: '🌳', shrub: '🌳', perennial: '🔁', annual: '🌱',
};

const HEALTH_COLOR: Record<string, string> = {
  excellent: '#4ADE80', good: '#4ADE80', fair: '#FACC15', poor: '#F87171',
};

// Small heuristic map for common Hebrew plant names — the app derives this
// from a larger internal dictionary we don't have on web; good enough for
// the common vegetables/herbs this app is built around, falls back to 🌱.
const NAME_EMOJI: Record<string, string> = {
  'עגבנייה': '🍅', 'עגבניה': '🍅', 'מלפפון': '🥒', 'בזיליקום': '🌿', 'פלפל': '🫑',
  'חציל': '🍆', 'גזר': '🥕', 'בצל': '🧅', 'שום': '🧄', 'תפוח אדמה': '🥔',
  'תות': '🍓', 'לימון': '🍋', 'תפוז': '🍊', 'חסה': '🥬', 'כרוב': '🥬',
  'תירס': '🌽', 'דלעת': '🎃', 'אבוקדו': '🥑', 'ענבים': '🍇', 'רימון': '🍎',
};

function plantEmoji(nameHe: string): string {
  for (const [name, emoji] of Object.entries(NAME_EMOJI)) {
    if (nameHe.includes(name)) return emoji;
  }
  return '🌱';
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

interface Props {
  plant:   GardenPlant;
  tracker: Tracker | null;
  onClick: () => void;
}

export function GardenPlantCard({ plant, tracker, onClick }: Props) {
  const locationType   = tracker?.location_type ?? plant.location_type ?? 'pot';
  const health         = tracker?.latest_checkin?.ai_analysis?.health ?? null;
  const growthStageHe  = tracker?.latest_checkin?.ai_analysis?.growthStageHe ?? null;
  const waterDays      = daysSince(tracker?.last_watered_at);
  const showWaterBadge = tracker != null && (waterDays === null || waterDays > 3);
  const typeEmoji      = plant.plant_type ? PLANT_TYPE_EMOJI[plant.plant_type] : null;

  return (
    <button
      onClick={onClick}
      style={{
        position:        'relative',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        gap:             '6px',
        padding:         '16px 10px 12px',
        borderRadius:    '14px',
        background:      NIGHT_CARD,
        border:          '1px solid rgba(0,229,195,0.15)',
        cursor:          'pointer',
        transition:      'transform 0.15s ease, border-color 0.15s ease',
        textAlign:       'center',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,195,0.4)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,195,0.15)';
      }}
    >
      {/* Health dot — top-right */}
      {health && (
        <span
          aria-hidden="true"
          title={health}
          style={{
            position: 'absolute', top: '8px', insetInlineEnd: '8px',
            width: '10px', height: '10px', borderRadius: '50%',
            background: HEALTH_COLOR[health] ?? '#9CA3AF',
            boxShadow: '0 0 0 2px rgba(17,31,24,0.9)',
          }}
        />
      )}

      {/* Water badge — top-left */}
      {showWaterBadge && (
        <span
          aria-hidden="true"
          title="צריך השקיה"
          style={{
            position: 'absolute', top: '8px', insetInlineStart: '8px',
            fontSize: '13px', lineHeight: 1,
            background: 'rgba(74,173,232,0.18)',
            border: '1px solid rgba(74,173,232,0.5)',
            borderRadius: '50%', width: '20px', height: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          💧
        </span>
      )}

      {/* Plant-type badge — bottom-right of emoji */}
      <div style={{ position: 'relative', width: '44px', height: '44px', marginTop: '4px' }}>
        <div style={{ fontSize: '38px', lineHeight: 1 }}>{plantEmoji(plant.common_name_he)}</div>
        {typeEmoji && (
          <span style={{
            position: 'absolute', bottom: '-2px', insetInlineEnd: '-6px',
            fontSize: '13px', background: NIGHT_CARD, borderRadius: '50%',
            width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(0,229,195,0.2)',
          }}>
            {typeEmoji}
          </span>
        )}
      </div>

      {/* Name + variety */}
      <div style={{ minHeight: '34px' }}>
        <p style={{ fontFamily: FRANK, fontWeight: 600, fontSize: '13px', color: TEXT_MID, margin: 0, lineHeight: 1.25 }}>
          {plant.common_name_he}
        </p>
        {plant.variety && (
          <p style={{ fontFamily: DM_SANS, fontSize: '10px', color: `${TEXT_MID}70`, margin: '1px 0 0' }}>
            {plant.variety}
          </p>
        )}
      </div>

      {growthStageHe && (
        <span style={{
          fontFamily: DM_SANS, fontSize: '9px', fontWeight: 600, color: BIO_CYAN,
          background: 'rgba(0,229,195,0.1)', border: '1px solid rgba(0,229,195,0.25)',
          borderRadius: '50px', padding: '2px 8px',
        }}>
          {growthStageHe}
        </span>
      )}

      {/* Planting base illustration */}
      <PlantingBase type={locationType} width={56} height={22} />
    </button>
  );
}

export function AddPlantCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             '8px',
        minHeight:       '148px',
        borderRadius:    '14px',
        background:      'rgba(0,229,195,0.04)',
        border:          '1.5px dashed rgba(0,229,195,0.3)',
        cursor:          'pointer',
        transition:      'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background  = 'rgba(0,229,195,0.09)';
        (e.currentTarget as HTMLElement).style.borderColor  = 'rgba(0,229,195,0.55)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background  = 'rgba(0,229,195,0.04)';
        (e.currentTarget as HTMLElement).style.borderColor  = 'rgba(0,229,195,0.3)';
      }}
    >
      <span style={{ fontSize: '28px', color: BIO_CYAN }}>+</span>
      <span style={{ fontFamily: FRANK, fontSize: '13px', fontWeight: 600, color: BIO_CYAN }}>
        הוסף צמח
      </span>
    </button>
  );
}
