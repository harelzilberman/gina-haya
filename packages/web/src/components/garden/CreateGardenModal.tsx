import { useState } from 'react';
import { useGardenSwitcherStore } from '../../stores/gardenSwitcherStore';
import { useToastStore } from '../../stores/toastStore';

const EARTH = '#142B16';
const GOLD  = '#F5C840';
const PARCH = '#EDE0C4';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASST  = '"Assistant", "Heebo", sans-serif';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (gardenId: string) => void;
}

export function CreateGardenModal({ isOpen, onClose, onCreated }: Props) {
  const { createGarden, switchGarden } = useGardenSwitcherStore();
  const { show: showToast } = useToastStore();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('יש להזין שם לגינה'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      const garden = await createGarden({
        name: name.trim(),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      });
      await switchGarden(garden.id);
      showToast(`הגינה '${garden.name}' נוצרה בהצלחה! 🏡`, 'success');
      setName(''); setLocation(''); setDescription('');
      onCreated?.(garden.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'לא ניתן ליצור גינה. נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(245,200,64,0.25)',
    borderRadius: '6px', padding: '10px 12px',
    fontFamily: ASST, fontSize: '14px', color: PARCH,
    outline: 'none', direction: 'rtl',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: ASST, fontSize: '13px',
    color: `${PARCH}BB`, marginBottom: '6px',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}
    >
      <div
        dir="rtl"
        style={{
          backgroundColor: '#1a3a1c',
          border: '1px solid rgba(245,200,64,0.2)',
          borderRadius: '14px',
          padding: '28px 24px',
          width: '100%', maxWidth: '420px',
          boxShadow: '0 20px 70px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, margin: 0 }}>
            גינה חדשה 🌿
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{ background: 'none', border: 'none', color: `${PARCH}50`, cursor: 'pointer', fontSize: '20px', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>שם הגינה *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="למשל: הגינה הקדמית, מרפסת דרום..."
              style={inputStyle}
              autoFocus
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>מיקום (אופציונלי)</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="למשל: תל אביב, קיבוץ כפר סאלד..."
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>תיאור (אופציונלי)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="מספר מילים על הגינה..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }}
            />
          </div>

          {error && (
            <p style={{ fontFamily: ASST, fontSize: '13px', color: '#e06060', marginBottom: '16px', textAlign: 'right' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                flex: 1, padding: '12px',
                background: 'transparent', color: `${PARCH}80`,
                border: '1px solid rgba(237,224,196,0.2)', borderRadius: '8px',
                fontFamily: ASST, fontSize: '14px', cursor: 'pointer',
              }}
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              style={{
                flex: 2, padding: '12px',
                backgroundColor: isSubmitting || !name.trim() ? 'rgba(245,200,64,0.4)' : GOLD,
                color: EARTH, border: 'none', borderRadius: '8px',
                fontFamily: FRANK, fontSize: '15px', fontWeight: 700,
                cursor: isSubmitting || !name.trim() ? 'not-allowed' : 'pointer',
                transition: 'filter 0.2s',
              }}
              onMouseEnter={e => { if (!isSubmitting && name.trim()) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              {isSubmitting ? 'יוצר גינה...' : 'צור גינה 🌿'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
