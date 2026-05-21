import { useState, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../api/client';
import { supabase } from '../../lib/supabase';

// ── Design tokens ─────────────────────────────────────────────────────────────
const NIGHT      = '#050d0a';
const NIGHT_MID  = '#091410';
const NIGHT_CARD = '#111f18';
const NIGHT_LIFT = '#0e1e17';
const BIO_CYAN   = '#00e5c3';
const BIO_AMBER  = '#ffb830';
const TEXT       = '#e8f5ee';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const ACTION_CHIPS = [
  { value: 'watering',    emoji: '💧', he: 'השקייה',   en: 'Watering'    },
  { value: 'planting',    emoji: '🌱', he: 'שתילה',    en: 'Planting'    },
  { value: 'harvesting',  emoji: '🌾', he: 'קטיף',     en: 'Harvesting'  },
  { value: 'fertilizing', emoji: '🧪', he: 'דישון',    en: 'Fertilizing' },
  { value: 'pruning',     emoji: '✂️', he: 'גיזום',    en: 'Pruning'     },
  { value: 'observation', emoji: '👁️', he: 'תצפית',   en: 'Observation' },
  { value: 'treatment',   emoji: '🩹', he: 'טיפול',    en: 'Treatment'   },
  { value: 'other',       emoji: '📝', he: 'אחר',      en: 'Other'       },
] as const;

interface UploadedPhoto {
  storagePath: string;
  localUrl:    string;
  entryPhotoId?: string;
  identifying:  boolean;
  identified:   boolean;
  plantData:    any | null;
}

interface Props {
  onCreated: () => void;
  onCancel:  () => void;
  isRTL:    boolean;
  isHe:     boolean;
}

export function JournalEntryForm({ onCreated, onCancel, isRTL, isHe }: Props) {
  const { session } = useAuthStore();
  const token = session?.access_token;

  const [actionType, setActionType] = useState<string>('');
  const [note,       setNote]       = useState('');
  const [isPublic,   setIsPublic]   = useState(false);
  const [photos,     setPhotos]     = useState<UploadedPhoto[]>([]);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(file: File) {
    if (!token) return;
    const ext    = file.name.split('.').pop() || 'jpg';
    const path   = `${session!.user.id}/${Date.now()}.${ext}`;
    const localUrl = URL.createObjectURL(file);

    const placeholder: UploadedPhoto = {
      storagePath: path, localUrl, identifying: false, identified: false, plantData: null,
    };
    setPhotos(prev => [...prev, placeholder]);

    const { error: upErr } = await supabase.storage
      .from('journal-photos')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (upErr) {
      setPhotos(prev => prev.filter(p => p.storagePath !== path));
      setError(isHe ? 'שגיאה בהעלאת תמונה' : 'Photo upload failed');
    }
  }

  async function handleIdentify(photo: UploadedPhoto, entryId: string) {
    if (!token || !photo.entryPhotoId) return;

    setPhotos(prev => prev.map(p =>
      p.storagePath === photo.storagePath ? { ...p, identifying: true } : p
    ));

    try {
      const result = await api.post<{ identification: any }>(
        `/api/journal/photos/${photo.entryPhotoId}/identify`,
        {},
        token,
      );

      const identification = result.identification;
      if (identification?.is_plant) {
        // Dispatch to ChupChu panel for confirm
        window.dispatchEvent(new CustomEvent('chupchu:plant-confirm', {
          detail: {
            photoId:    photo.entryPhotoId,
            nameHe:     identification.name_he,
            nameEn:     identification.name_en,
            category:   identification.category,
            zoneId:     identification.zone_id,
            confidence: identification.confidence,
          },
        }));
      }

      setPhotos(prev => prev.map(p =>
        p.storagePath === photo.storagePath
          ? { ...p, identifying: false, identified: true, plantData: identification }
          : p
      ));
    } catch {
      setPhotos(prev => prev.map(p =>
        p.storagePath === photo.storagePath ? { ...p, identifying: false } : p
      ));
    }
  }

  async function handleSave() {
    if (!actionType) {
      setError(isHe ? 'בחר/י סוג פעולה' : 'Please select an action type');
      return;
    }
    if (!token) return;
    setSaving(true);
    setError(null);

    try {
      // 1. Create entry
      const entry = await api.post<{ id: string }>(
        '/api/journal/entries',
        { actionType, note: note.trim() || null, isPublic, entryDate: new Date().toISOString() },
        token,
      );

      // 2. Register photo rows and optionally identify
      const updatedPhotos: UploadedPhoto[] = [];
      for (const photo of photos) {
        const photoRow = await api.post<{ id: string }>(
          '/api/journal/photos',
          { entryId: entry.id, storagePath: photo.storagePath },
          token,
        );
        const updated = { ...photo, entryPhotoId: photoRow.id };
        updatedPhotos.push(updated);

        // Auto-identify each photo after saving
        await handleIdentify(updated, entry.id);
      }

      onCreated();
    } catch (err: any) {
      setError(err.message || (isHe ? 'שגיאה בשמירה' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  function removePhoto(storagePath: string) {
    setPhotos(prev => prev.filter(p => p.storagePath !== storagePath));
    supabase.storage.from('journal-photos').remove([storagePath]).catch(() => {});
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{
      borderRadius: '16px',
      background: `linear-gradient(180deg, ${NIGHT_LIFT} 0%, ${NIGHT_CARD} 100%)`,
      border: '1px solid rgba(0,229,195,0.22)',
      boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(0,229,195,0.1)',
      }}>
        <h3 style={{ fontFamily: FRANK, fontSize: '17px', fontWeight: 700, color: BIO_CYAN, margin: 0 }}>
          📖 {isHe ? 'רשומה חדשה ביומן' : 'New Journal Entry'}
        </h3>
        <button onClick={onCancel} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: `${TEXT_MID}55`, fontSize: '16px', padding: '2px 6px',
        }}>✕</button>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Action type chips */}
        <div>
          <label style={{ fontFamily: DM_SANS, fontSize: '12px', fontWeight: 600, color: MUTED, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {isHe ? 'סוג פעולה' : 'Action Type'}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {ACTION_CHIPS.map(chip => {
              const sel = actionType === chip.value;
              return (
                <button
                  key={chip.value}
                  onClick={() => setActionType(chip.value)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '6px 12px', borderRadius: '20px',
                    border: `1px solid ${sel ? BIO_CYAN : 'rgba(0,229,195,0.18)'}`,
                    background: sel ? 'rgba(0,229,195,0.15)' : 'transparent',
                    color: sel ? BIO_CYAN : TEXT_MID,
                    fontFamily: DM_SANS, fontSize: '13px', fontWeight: sel ? 700 : 400,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {chip.emoji} {isHe ? chip.he : chip.en}
                </button>
              );
            })}
          </div>
        </div>

        {/* Note textarea */}
        <div>
          <label style={{ fontFamily: DM_SANS, fontSize: '12px', fontWeight: 600, color: MUTED, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {isHe ? 'הערות' : 'Notes'}
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={isHe ? 'מה קרה בגינה היום?' : "What happened in the garden today?"}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(9,20,16,0.85)', border: '1px solid rgba(0,229,195,0.2)',
              borderRadius: '10px', padding: '10px 13px',
              fontFamily: DM_SANS, fontSize: '14px', color: TEXT_MID,
              lineHeight: 1.6, resize: 'vertical',
              outline: 'none', direction: isRTL ? 'rtl' : 'ltr',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { (e.target as HTMLElement).style.borderColor = 'rgba(0,229,195,0.45)'; }}
            onBlur={e => { (e.target as HTMLElement).style.borderColor = 'rgba(0,229,195,0.2)'; }}
          />
        </div>

        {/* Photo upload */}
        <div>
          <label style={{ fontFamily: DM_SANS, fontSize: '12px', fontWeight: 600, color: MUTED, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {isHe ? 'תמונות (זיהוי צמחים אוטומטי)' : 'Photos (auto plant ID)'}
          </label>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {photos.map(photo => (
              <div key={photo.storagePath} style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={photo.localUrl}
                  alt=""
                  style={{
                    width: '72px', height: '72px', objectFit: 'cover',
                    borderRadius: '8px', border: '1px solid rgba(0,229,195,0.15)',
                  }}
                />
                {/* Status overlay */}
                {photo.identifying && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '8px',
                    background: 'rgba(5,13,10,0.75)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px',
                  }}>
                    🔍
                  </div>
                )}
                {photo.identified && photo.plantData?.is_plant && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(0,229,195,0.85)', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px',
                    padding: '2px 4px',
                    fontFamily: DM_SANS, fontSize: '9px', color: NIGHT, textAlign: 'center',
                    fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    ✓ {photo.plantData.name_he}
                  </div>
                )}
                {/* Remove button */}
                <button
                  onClick={() => removePhoto(photo.storagePath)}
                  style={{
                    position: 'absolute', top: '-6px', insetInlineEnd: '-6px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: '#ff4444', border: 'none', color: '#fff',
                    fontSize: '10px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >✕</button>
              </div>
            ))}

            {/* Add photo button */}
            {photos.length < 6 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '72px', height: '72px', borderRadius: '8px', flexShrink: 0,
                  background: 'rgba(0,229,195,0.05)', border: '1.5px dashed rgba(0,229,195,0.3)',
                  color: MUTED, fontSize: '24px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = BIO_CYAN; el.style.color = BIO_CYAN; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(0,229,195,0.3)'; el.style.color = MUTED; }}
              >
                +
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={e => {
              Array.from(e.target.files || []).forEach(f => handlePhotoUpload(f));
              e.target.value = '';
            }}
          />
        </div>

        {/* Share toggle */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
        }}>
          <div
            onClick={() => setIsPublic(v => !v)}
            style={{
              width: '40px', height: '22px', borderRadius: '11px',
              background: isPublic ? BIO_CYAN : 'rgba(0,229,195,0.15)',
              border: `1px solid ${isPublic ? BIO_CYAN : 'rgba(0,229,195,0.25)'}`,
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: '2px',
              insetInlineStart: isPublic ? 'calc(100% - 20px)' : '2px',
              width: '16px', height: '16px', borderRadius: '50%',
              background: isPublic ? NIGHT : MUTED,
              transition: 'inset-inline-start 0.2s',
            }} />
          </div>
          <span style={{ fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID }}>
            {isHe ? 'שתף בגלריה הקהילתית' : 'Share in Community Gallery'}
          </span>
        </label>

        {error && (
          <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: '#ff5c8a', margin: 0 }}>{error}</p>
        )}

        {/* Footer buttons */}
        <div style={{ display: 'flex', gap: '10px', paddingTop: '2px' }}>
          <button
            onClick={handleSave}
            disabled={saving || !actionType}
            style={{
              flex: 2, padding: '11px',
              borderRadius: '10px', border: 'none',
              background: actionType ? BIO_CYAN : 'rgba(0,229,195,0.18)',
              color: actionType ? NIGHT : `${TEXT_MID}44`,
              fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
              cursor: saving || !actionType ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
              transition: 'opacity 0.2s, filter 0.2s',
            }}
            onMouseEnter={e => { if (actionType && !saving) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
          >
            {saving ? (isHe ? 'שומר...' : 'Saving...') : (isHe ? 'שמור רשומה ✓' : 'Save Entry ✓')}
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '11px',
              borderRadius: '10px', background: 'transparent',
              border: '1px solid rgba(0,229,195,0.2)', color: MUTED,
              fontFamily: DM_SANS, fontSize: '13px', cursor: 'pointer',
            }}
          >
            {isHe ? 'ביטול' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
