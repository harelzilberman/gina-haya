import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const EARTH = '#142B16';
const GOLD  = '#F5C840';
const PARCH = '#EDE0C4';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASST  = '"Assistant", "Heebo", sans-serif';

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
    : 'תחילת החודש הבא';

  switch (limitType) {
    case 'plants':
      return {
        title:  'הגינה שלך גדלה! 🌱',
        body:   'הוספת 10 צמחים — המקסימום בחשבון חינמי.\nשדרג לגנן כדי להוסיף צמחים ללא הגבלה.',
        image:  '/chupchu_happy.png',
        primaryLabel:   'שדרג עכשיו',
        primaryTo:      '/pricing',
      };

    case 'trackers':
      return {
        title: 'מעקב הגידול שלך ממתין! 🌿',
        body:  'בחשבון חינמי ניתן לנהל מעקב גידול אחד.\nשדרג לגנן למעקבים ללא הגבלה — ₪18 בלבד לחודש.',
        image: '/chupchu_thinking.png',
        primaryLabel:  'שדרג עכשיו',
        primaryTo:     '/pricing',
      };

    case 'analysis':
      if (currentTier === 'grower') {
        return {
          title: '30 ניתוחים בחודש — כל הכבוד! 🔬',
          body:  `הגעת למגבלה החודשית.\nהמגבלה מתאפסת ב-${resetLabel}.\nצריך עוד? רכוש חבילת ניתוחים בחנות.`,
          image: '/chupchu_wise.png',
          primaryLabel:  'לחנות',
          primaryTo:     '/shop',
        };
      }
      return {
        title: 'ניצלת את הניתוח החינמי שלך! 🔬',
        body:  'קיבלת טעימה של הניתוח. רוצה עוד?\nשדרג לגנן לניתוחים ללא הגבלה, או רכוש חבילה בחנות.',
        image: '/chupchu_surprised.png',
        primaryLabel:   'שדרג לגנן',
        primaryTo:      '/pricing',
        secondaryLabel: 'רכוש חבילה',
        secondaryTo:    '/shop',
      };

    case 'chupchu':
      if (currentTier === 'grower') {
        return {
          title: '50 שיחות עם צ\'ופצ\'ו! 🌙',
          body:  'הגעת למגבלה החודשית.\nשדרג למקצועי לשיחות ללא הגבלה עם צ\'ופצ\'ו.',
          image: '/chupchu_thinking.png',
          primaryLabel:  'שדרג עכשיו',
          primaryTo:     '/pricing',
        };
      }
      return {
        title: 'צ\'ופצ\'ו עייף קצת... 🌙',
        body:  'השתמשת ב-20 השיחות החינמיות החודשיות.\nשדרג לגנן כדי לקבל 50 שיחות לחודש — ₪18 בלבד.',
        image: '/chupchu_thinking.png',
        primaryLabel:  'שדרג עכשיו',
        primaryTo:     '/pricing',
      };

    case 'gardens':
      return {
        title: 'גינות מרובות — תכונת מקצוענים! 🏡',
        body:  'ניהול מספר גינות זמין בתכנית המקצועית.\nשדרג ל-₪54 לחודש וקבל 13 גינות + אפשרות לחבילות נוספות.',
        image: '/chupchu_wise.png',
        primaryLabel:  'שדרג עכשיו',
        primaryTo:     '/pricing',
      };

    case 'encyclopedia':
      return {
        title: 'האנציקלופדיה הביודינמית 📖',
        body:  'הגישה המלאה לאנציקלופדיה זמינה בתכניות גנן ומקצועי.\nשדרג לגנן ב-₪18 לחודש וגלה את מלוא הידע.',
        image: '/chupchu_wise.png',
        primaryLabel:  'שדרג לגנן',
        primaryTo:     '/pricing',
      };
  }
}

export function UpgradeModal({ isOpen, onClose, limitType, currentTier = 'free', resetsAt }: Props) {
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
          border: '1px solid rgba(245,200,64,0.25)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '420px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          backgroundColor: '#142B16',
          borderBottom: '1px solid rgba(245,200,64,0.1)',
          padding: '20px 24px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '64px', height: '64px', flexShrink: 0,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 40%, #F5D060, #F5C840, #C8960A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', position: 'relative',
          }}>
            <span style={{ position: 'absolute', fontSize: '28px' }}>🌕</span>
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
            style={{ background: 'none', border: 'none', color: 'rgba(237,224,196,0.4)', cursor: 'pointer', fontSize: '18px', padding: '4px', flexShrink: 0 }}
          >
            ✕
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
                  border: `1px solid rgba(245,200,64,0.4)`,
                  borderRadius: '10px',
                  fontFamily: FRANK, fontSize: '15px', fontWeight: 600,
                  cursor: 'pointer', transition: 'border-color 0.2s, background-color 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = GOLD;
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245,200,64,0.06)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,200,64,0.4)';
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
                color: 'rgba(237,224,196,0.4)',
                border: 'none',
                fontFamily: ASST, fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
