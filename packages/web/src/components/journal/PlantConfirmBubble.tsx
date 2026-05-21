import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../api/client';

// ── Design tokens ─────────────────────────────────────────────────────────────
const NIGHT      = '#050d0a';
const NIGHT_CARD = '#111f18';
const NIGHT_LIFT = '#0e1e17';
const BIO_CYAN   = '#00e5c3';
const BIO_LIME   = '#aaff00';
const TEXT       = '#e8f5ee';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

export interface ConfirmItem {
  photoId:     string;
  nameHe:      string;
  nameEn:      string;
  category:    string;
  zoneId:      'grow-bed' | 'herb-garden' | 'general';
  confidence:  string;
}

interface Props {
  item:       ConfirmItem;
  onDone:     () => void;
  onDismiss:  () => void;
}

const ZONE_LABEL: Record<string, string> = {
  'grow-bed':    'ערוגת גידול',
  'herb-garden': 'גינת עשבים',
  'general':     'כללי',
};

const CAT_EMOJI: Record<string, string> = {
  vegetable: '🥦',
  herb:      '🌿',
  fruit:     '🍓',
  flower:    '🌸',
  other:     '🌱',
};

export function PlantConfirmBubble({ item, onDone, onDismiss }: Props) {
  const { session } = useAuthStore();
  const [nameHe,   setNameHe]   = useState(item.nameHe);
  const [nameEn,   setNameEn]   = useState(item.nameEn);
  const [zoneId,   setZoneId]   = useState<'grow-bed' | 'herb-garden' | 'general'>(item.zoneId);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleConfirm() {
    if (!nameHe.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(
        `/api/journal/photos/${item.photoId}/confirm`,
        { confirmedNameHe: nameHe, confirmedNameEn: nameEn, confirmedCategory: item.category, zoneId },
        session?.access_token,
      );
      setSuccess(true);
      setTimeout(onDone, 1800);
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div style={{
        margin: '0 16px 10px',
        padding: '14px 16px',
        borderRadius: '12px',
        background: `linear-gradient(135deg, rgba(0,229,195,0.1), rgba(170,255,0,0.08))`,
        border: '1px solid rgba(0,229,195,0.3)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '28px', marginBottom: '6px' }}>✅</div>
        <p style={{ fontFamily: FRANK, fontSize: '14px', color: BIO_CYAN, margin: 0 }}>
          {nameHe} נוסף/ה לגינה!
        </p>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{
      margin: '0 16px 10px',
      borderRadius: '14px',
      background: `linear-gradient(180deg, ${NIGHT_LIFT} 0%, ${NIGHT_CARD} 100%)`,
      border: '1px solid rgba(0,229,195,0.22)',
      boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px 8px',
        borderBottom: '1px solid rgba(0,229,195,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>{CAT_EMOJI[item.category] ?? '🌱'}</span>
          <div>
            <p style={{ fontFamily: FRANK, fontSize: '13px', fontWeight: 700, color: BIO_CYAN, margin: 0 }}>
              צמח זוהה! אשר הוספה לגינה
            </p>
            <p style={{ fontFamily: DM_SANS, fontSize: '11px', color: MUTED, margin: 0 }}>
              בטחון: {item.confidence === 'high' ? 'גבוה' : item.confidence === 'medium' ? 'בינוני' : 'נמוך'}
            </p>
          </div>
        </div>
        <button onClick={onDismiss} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: `${TEXT_MID}55`, fontSize: '14px', padding: '2px 4px',
        }}>✕</button>
      </div>

      {/* Fields */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Hebrew name */}
        <div>
          <label style={{ fontFamily: DM_SANS, fontSize: '11px', color: MUTED, display: 'block', marginBottom: '4px' }}>
            שם בעברית
          </label>
          <input
            value={nameHe}
            onChange={e => setNameHe(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(9,20,16,0.85)', border: '1px solid rgba(0,229,195,0.2)',
              borderRadius: '7px', padding: '7px 10px',
              fontFamily: DM_SANS, fontSize: '13px', color: TEXT,
              outline: 'none', direction: 'rtl',
            }}
          />
        </div>

        {/* English name */}
        <div>
          <label style={{ fontFamily: DM_SANS, fontSize: '11px', color: MUTED, display: 'block', marginBottom: '4px' }}>
            Plant name (English)
          </label>
          <input
            value={nameEn}
            onChange={e => setNameEn(e.target.value)}
            dir="ltr"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(9,20,16,0.85)', border: '1px solid rgba(0,229,195,0.2)',
              borderRadius: '7px', padding: '7px 10px',
              fontFamily: DM_SANS, fontSize: '13px', color: TEXT,
              outline: 'none', direction: 'ltr', textAlign: 'left',
            }}
          />
        </div>

        {/* Zone selector */}
        <div>
          <label style={{ fontFamily: DM_SANS, fontSize: '11px', color: MUTED, display: 'block', marginBottom: '4px' }}>
            אזור בגינה
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['grow-bed', 'herb-garden', 'general'] as const).map(z => (
              <button
                key={z}
                onClick={() => setZoneId(z)}
                style={{
                  flex: 1, padding: '6px 4px',
                  borderRadius: '7px', border: `1px solid ${zoneId === z ? BIO_CYAN : 'rgba(0,229,195,0.15)'}`,
                  background: zoneId === z ? 'rgba(0,229,195,0.12)' : 'transparent',
                  color: zoneId === z ? BIO_CYAN : MUTED,
                  fontFamily: DM_SANS, fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {ZONE_LABEL[z]}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p style={{ fontFamily: DM_SANS, fontSize: '12px', color: '#ff5c8a', margin: 0 }}>{error}</p>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
          <button
            onClick={handleConfirm}
            disabled={saving || !nameHe.trim()}
            style={{
              flex: 2, padding: '9px',
              borderRadius: '8px', border: 'none',
              background: nameHe.trim() ? BIO_CYAN : 'rgba(0,229,195,0.2)',
              color: nameHe.trim() ? NIGHT : `${TEXT_MID}44`,
              fontFamily: FRANK, fontSize: '13px', fontWeight: 700,
              cursor: saving || !nameHe.trim() ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
              transition: 'opacity 0.2s, filter 0.2s',
            }}
            onMouseEnter={e => { if (nameHe.trim() && !saving) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
          >
            {saving ? 'שומר...' : `הוסף "${nameHe}" לגינה ✓`}
          </button>
          <button
            onClick={onDismiss}
            style={{
              flex: 1, padding: '9px',
              borderRadius: '8px', border: '1px solid rgba(0,229,195,0.2)',
              background: 'transparent', color: MUTED,
              fontFamily: DM_SANS, fontSize: '12px',
              cursor: 'pointer', transition: 'color 0.15s',
            }}
          >
            דלג
          </button>
        </div>
      </div>
    </div>
  );
}
