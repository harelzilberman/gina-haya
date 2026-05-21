import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const EARTH = '#050d0a';
const GOLD  = '#00e5c3';
const PARCH = '#b0cfbf';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASST  = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

export type UpgradeLimitType =
  | 'plants' | 'trackers' | 'analysis' | 'chupchu' | 'gardens' | 'encyclopedia';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  limitType: UpgradeLimitType;
  currentTier?: string;
  current?: number;
  limit?: number;
  resetsAt?: string;
}

interface Content {
  title: string;
  body: string;
  image: string;
  primaryLabel: string;
  primaryTo: string;
  secondaryLabel?: string;
  secondaryTo?: string;
}

function getContent(
  limitType: UpgradeLimitType,
  currentTier: string,
  resetsAt?: string,
): Content {
  const resetLabel = resetsAt
    ? new Date(resetsAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })
    : '×ª×—×™×œ×ª ×”×—×•×“×© ×”×‘×';

  switch (limitType) {
    case 'plants':
      return {
        title:  '×”×’×™× ×” ×©×œ×š ×’×“×œ×”! ðŸŒ±',
        body:   '×”×•×¡×¤×ª 10 ×¦×ž×—×™× â€” ×”×ž×§×¡×™×ž×•× ×‘×—×©×‘×•×Ÿ ×—×™× ×ž×™.\n×©×“×¨×’ ×œ×’× ×Ÿ ×›×“×™ ×œ×”×•×¡×™×£ ×¦×ž×—×™× ×œ×œ× ×”×’×‘×œ×”.',
        image:  '/chupchu_happy.png',
        primaryLabel:   '×©×“×¨×’ ×¢×›×©×™×•',
        primaryTo:      '/pricing',
      };

    case 'trackers':
      return {
        title: '×ž×¢×§×‘ ×”×’×™×“×•×œ ×©×œ×š ×ž×ž×ª×™×Ÿ! ðŸŒ¿',
        body:  '×‘×—×©×‘×•×Ÿ ×—×™× ×ž×™ × ×™×ª×Ÿ ×œ× ×”×œ ×ž×¢×§×‘ ×’×™×“×•×œ ××—×“.\n×©×“×¨×’ ×œ×’× ×Ÿ ×œ×ž×¢×§×‘×™× ×œ×œ× ×”×’×‘×œ×” â€” â‚ª18 ×‘×œ×‘×“ ×œ×—×•×“×©.',
        image: '/chupchu_thinking.png',
        primaryLabel:  '×©×“×¨×’ ×¢×›×©×™×•',
        primaryTo:     '/pricing',
      };

    case 'analysis':
      if (currentTier === 'grower') {
        return {
          title: '30 × ×™×ª×•×—×™× ×‘×—×•×“×© â€” ×›×œ ×”×›×‘×•×“! ðŸ”¬',
          body:  `×”×’×¢×ª ×œ×ž×’×‘×œ×” ×”×—×•×“×©×™×ª.\n×”×ž×’×‘×œ×” ×ž×ª××¤×¡×ª ×‘-${resetLabel}.\n×¦×¨×™×š ×¢×•×“? ×¨×›×•×© ×—×‘×™×œ×ª × ×™×ª×•×—×™× ×‘×—× ×•×ª.`,
          image: '/chupchu_wise.png',
          primaryLabel:  '×œ×—× ×•×ª',
          primaryTo:     '/shop',
        };
      }
      return {
        title: '× ×™×¦×œ×ª ××ª ×”× ×™×ª×•×— ×”×—×™× ×ž×™ ×©×œ×š! ðŸ”¬',
        body:  '×§×™×‘×œ×ª ×˜×¢×™×ž×” ×©×œ ×”× ×™×ª×•×—. ×¨×•×¦×” ×¢×•×“?\n×©×“×¨×’ ×œ×’× ×Ÿ ×œ× ×™×ª×•×—×™× ×œ×œ× ×”×’×‘×œ×”, ××• ×¨×›×•×© ×—×‘×™×œ×” ×‘×—× ×•×ª.',
        image: '/chupchu_surprised.png',
        primaryLabel:   '×©×“×¨×’ ×œ×’× ×Ÿ',
        primaryTo:      '/pricing',
        secondaryLabel: '×¨×›×•×© ×—×‘×™×œ×”',
        secondaryTo:    '/shop',
      };

    case 'chupchu':
      if (currentTier === 'grower') {
        return {
          title: '50 ×©×™×—×•×ª ×¢× ×¦\'×•×¤×¦\'×•! ðŸŒ™',
          body:  '×”×’×¢×ª ×œ×ž×’×‘×œ×” ×”×—×•×“×©×™×ª.\n×©×“×¨×’ ×œ×ž×§×¦×•×¢×™ ×œ×©×™×—×•×ª ×œ×œ× ×”×’×‘×œ×” ×¢× ×¦\'×•×¤×¦\'×•.',
          image: '/chupchu_thinking.png',
          primaryLabel:  '×©×“×¨×’ ×¢×›×©×™×•',
          primaryTo:     '/pricing',
        };
      }
      return {
        title: '×¦\'×•×¤×¦\'×• ×¢×™×™×£ ×§×¦×ª... ðŸŒ™',
        body:  '×”×©×ª×ž×©×ª ×‘-20 ×”×©×™×—×•×ª ×”×—×™× ×ž×™×•×ª ×”×—×•×“×©×™×•×ª.\n×©×“×¨×’ ×œ×’× ×Ÿ ×›×“×™ ×œ×§×‘×œ 50 ×©×™×—×•×ª ×œ×—×•×“×© â€” â‚ª18 ×‘×œ×‘×“.',
        image: '/chupchu_thinking.png',
        primaryLabel:  '×©×“×¨×’ ×¢×›×©×™×•',
        primaryTo:     '/pricing',
      };

    case 'gardens':
      return {
        title: '×’×™× ×•×ª ×ž×¨×•×‘×•×ª â€” ×ª×›×•× ×ª ×ž×§×¦×•×¢× ×™×! ðŸ¡',
        body:  '× ×™×”×•×œ ×ž×¡×¤×¨ ×’×™× ×•×ª ×–×ž×™×Ÿ ×‘×ª×›× ×™×ª ×”×ž×§×¦×•×¢×™×ª.\n×©×“×¨×’ ×œ-â‚ª54 ×œ×—×•×“×© ×•×§×‘×œ 13 ×’×™× ×•×ª + ××¤×©×¨×•×ª ×œ×—×‘×™×œ×•×ª × ×•×¡×¤×•×ª.',
        image: '/chupchu_wise.png',
        primaryLabel:  '×©×“×¨×’ ×¢×›×©×™×•',
        primaryTo:     '/pricing',
      };

    case 'encyclopedia':
      return {
        title: '×”×× ×¦×™×§×œ×•×¤×“×™×” ×”×‘×™×•×“×™× ×ž×™×ª ðŸ“–',
        body:  '×”×’×™×©×” ×”×ž×œ××” ×œ×× ×¦×™×§×œ×•×¤×“×™×” ×–×ž×™× ×” ×‘×ª×›× ×™×•×ª ×’× ×Ÿ ×•×ž×§×¦×•×¢×™.\n×©×“×¨×’ ×œ×’× ×Ÿ ×‘-â‚ª18 ×œ×—×•×“×© ×•×’×œ×” ××ª ×ž×œ×•× ×”×™×“×¢.',
        image: '/chupchu_wise.png',
        primaryLabel:  '×©×“×¨×’ ×œ×’× ×Ÿ',
        primaryTo:     '/pricing',
      };
  }
}

export function UpgradeModal({ isOpen, onClose, limitType, currentTier = 'free', resetsAt }: Props) {
  if (import.meta.env.PROD && import.meta.env.VITE_LAUNCH_FREE_MODE === 'true') {
    return null;
  }

  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';

  if (!isOpen) return null;

  const c = getContent(limitType, currentTier, resetsAt);

  function go(to: string) {
    onClose();
    navigate(to);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        dir={isHe ? 'rtl' : 'ltr'}
        style={{
          backgroundColor: '#1a3a1c',
          border: '1px solid rgba(0,229,195,0.25)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '420px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          backgroundColor: '#050d0a',
          borderBottom: '1px solid rgba(0,229,195,0.1)',
          padding: '20px 24px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '64px', height: '64px', flexShrink: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 40%, #b0e8e0, #00e5c3, #00a08a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', position: 'relative',
          }}>
            <span style={{ position: 'absolute', fontSize: '28px' }}>ðŸŒ•</span>
            <img
              src={c.image}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <h2 style={{ fontFamily: FRANK, fontSize: '19px', color: GOLD, margin: 0, flex: 1 }}>
            {c.title}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(176,207,191,0.4)', cursor: 'pointer', fontSize: '18px', padding: '4px', flexShrink: 0 }}
          >
            âœ•
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <p style={{
            fontFamily: ASST, fontSize: '15px', color: `${PARCH}CC`,
            margin: '0 0 24px', lineHeight: 1.7, whiteSpace: 'pre-line',
          }}>
            {c.body}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Primary CTA */}
            <button
              onClick={() => go(c.primaryTo)}
              style={{
                width: '100%', padding: '13px',
                backgroundColor: GOLD, color: EARTH,
                border: 'none', borderRadius: '10px',
                fontFamily: FRANK, fontSize: '16px', fontWeight: 700,
                cursor: 'pointer', transition: 'filter 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              {c.primaryLabel}
            </button>

            {/* Secondary CTA (optional) */}
            {c.secondaryLabel && c.secondaryTo && (
              <button
                onClick={() => go(c.secondaryTo!)}
                style={{
                  width: '100%', padding: '12px',
                  backgroundColor: 'transparent',
                  color: GOLD,
                  border: `1px solid rgba(0,229,195,0.4)`,
                  borderRadius: '10px',
                  fontFamily: FRANK, fontSize: '15px', fontWeight: 600,
                  cursor: 'pointer', transition: 'border-color 0.2s, background-color 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = GOLD;
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,229,195,0.06)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,195,0.4)';
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                {c.secondaryLabel}
              </button>
            )}

            {/* Dismiss */}
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '10px',
                backgroundColor: 'transparent',
                color: 'rgba(176,207,191,0.4)',
                border: 'none',
                fontFamily: ASST, fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ×¡×’×•×¨
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
