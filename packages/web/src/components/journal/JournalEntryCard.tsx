import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

// ── Design tokens ─────────────────────────────────────────────────────────────
const NIGHT_CARD = '#111f18';
const NIGHT_LIFT = '#0e1e17';
const BIO_CYAN   = '#00e5c3';
const BIO_AMBER  = '#ffb830';
const TEXT       = '#e8f5ee';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const ACTION_LABELS: Record<string, { he: string; en: string; emoji: string; color: string }> = {
  watering:     { he: 'השקייה',    en: 'Watering',     emoji: '💧', color: '#38bdf8' },
  planting:     { he: 'שתילה',     en: 'Planting',      emoji: '🌱', color: BIO_CYAN  },
  harvesting:   { he: 'קטיף',      en: 'Harvesting',    emoji: '🌾', color: BIO_AMBER },
  fertilizing:  { he: 'דישון',     en: 'Fertilizing',   emoji: '🧪', color: '#a78bfa' },
  pruning:      { he: 'גיזום',     en: 'Pruning',       emoji: '✂️', color: '#fb923c' },
  observation:  { he: 'תצפית',     en: 'Observation',   emoji: '👁️', color: '#34d399' },
  treatment:    { he: 'טיפול',     en: 'Treatment',     emoji: '🩹', color: '#f472b6' },
  other:        { he: 'אחר',       en: 'Other',         emoji: '📝', color: MUTED     },
};

interface Photo {
  id: string;
  storage_path: string;
  caption: string | null;
  identified_name_he: string | null;
  identified_name_en: string | null;
}

export interface JournalEntry {
  id:          string;
  action_type: string;
  note:        string | null;
  entry_date:  string;
  is_public:   boolean;
  journal_photos: Photo[];
}

interface Props {
  entry:    JournalEntry;
  onDelete: (id: string) => void;
  isRTL:   boolean;
  isHe:    boolean;
}

function PhotoThumbnail({ photo }: { photo: Photo }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.storage
      .from('journal-photos')
      .createSignedUrl(photo.storage_path, 3600)
      .then(({ data }) => { if (data?.signedUrl) setSignedUrl(data.signedUrl); })
      .catch(() => {});
  }, [photo.storage_path]);

  if (!signedUrl) {
    return (
      <div style={{
        width: '80px', height: '80px', borderRadius: '8px', flexShrink: 0,
        background: 'rgba(0,229,195,0.05)', border: '1px solid rgba(0,229,195,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '20px',
      }}>🌿</div>
    );
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <img
        src={signedUrl}
        alt={photo.caption || 'תמונת גינה'}
        style={{
          width: '80px', height: '80px', borderRadius: '8px',
          objectFit: 'cover', border: '1px solid rgba(0,229,195,0.12)',
        }}
      />
      {photo.identified_name_he && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(5,13,10,0.85)',
          borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px',
          padding: '2px 5px',
          fontFamily: DM_SANS, fontSize: '9px', color: BIO_CYAN,
          textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {photo.identified_name_he}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function JournalEntryCard({ entry, onDelete, isRTL, isHe }: Props) {
  const action = ACTION_LABELS[entry.action_type] ?? ACTION_LABELS.other;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{
      borderRadius: '14px',
      background: `linear-gradient(180deg, ${NIGHT_LIFT} 0%, ${NIGHT_CARD} 100%)`,
      border: '1px solid rgba(0,229,195,0.12)',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,195,0.25)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,195,0.12)'; }}
    >
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px 10px',
        borderBottom: entry.journal_photos.length > 0 || entry.note ? '1px solid rgba(0,229,195,0.08)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Action badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '4px 10px', borderRadius: '20px',
            background: `${action.color}18`,
            border: `1px solid ${action.color}30`,
            fontFamily: DM_SANS, fontSize: '12px', fontWeight: 700,
            color: action.color,
          }}>
            {action.emoji} {isHe ? action.he : action.en}
          </span>

          {entry.is_public && (
            <span style={{
              padding: '3px 8px', borderRadius: '20px',
              background: 'rgba(0,229,195,0.08)', border: '1px solid rgba(0,229,195,0.2)',
              fontFamily: DM_SANS, fontSize: '11px', color: BIO_CYAN,
            }}>
              {isHe ? 'ציבורי' : 'Public'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: DM_SANS, fontSize: '12px', color: MUTED }}>
            {formatDate(entry.entry_date)}
          </span>

          {/* Delete button */}
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => onDelete(entry.id)}
                style={{
                  padding: '3px 8px', borderRadius: '6px', border: 'none',
                  background: '#ff4444', color: '#fff',
                  fontFamily: DM_SANS, fontSize: '11px', cursor: 'pointer',
                }}
              >
                {isHe ? 'מחק' : 'Delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: '3px 8px', borderRadius: '6px',
                  border: '1px solid rgba(0,229,195,0.2)', background: 'transparent',
                  color: MUTED, fontFamily: DM_SANS, fontSize: '11px', cursor: 'pointer',
                }}
              >
                {isHe ? 'ביטול' : 'Cancel'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              title={isHe ? 'מחק' : 'Delete'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,80,80,0.4)', fontSize: '14px', padding: '2px 4px',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff5c5c'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,80,80,0.4)'; }}
            >
              🗑
            </button>
          )}
        </div>
      </div>

      {/* Note */}
      {entry.note && (
        <div style={{ padding: '10px 16px 0' }}>
          <p style={{
            fontFamily: DM_SANS, fontSize: '14px', color: TEXT_MID,
            lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap',
          }}>
            {entry.note}
          </p>
        </div>
      )}

      {/* Photos */}
      {entry.journal_photos.length > 0 && (
        <div style={{
          display: 'flex', gap: '8px', flexWrap: 'wrap',
          padding: '10px 16px 14px', overflowX: 'auto',
        }}>
          {entry.journal_photos.map(p => (
            <PhotoThumbnail key={p.id} photo={p} />
          ))}
        </div>
      )}

      {/* Empty spacer when no extra content */}
      {!entry.note && entry.journal_photos.length === 0 && (
        <div style={{ height: '14px' }} />
      )}
    </div>
  );
}
