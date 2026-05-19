import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { ChupChuChat } from '../components/chupchu/ChupChuChat';
import { useChupChu } from '../hooks/useChupChu';
import { useAuthStore } from '../stores/authStore';

// ── Design tokens ──────────────────────────────────────────────────────────
const GOLD   = '#F5C840';
const PARCH  = '#EDE0C4';
const ASSIST = '"Assistant", "Heebo", sans-serif';
const CAVEAT = "'Caveat', cursive";

const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

const SUGGESTED_QUESTIONS = [
  'מה היום הטוב ביותר לזרוע השבוע?',
  'איך להכין תה קומפוסט?',
  'מתי להשתמש ב-BD 500?',
  'מה לגדל בחודש הזה?',
];

const PAGE_CSS = `
@keyframes ccp-float {
  0%   { transform: translateY(0px)   rotate(-1deg); }
  50%  { transform: translateY(-10px) rotate(1deg);  }
  100% { transform: translateY(0px)   rotate(-1deg); }
}
.ccp-img { animation: ccp-float 3.5s ease-in-out infinite; }
.ccp-chip {
  width: 100%;
  text-align: right;
  padding: 9px 16px;
  border-radius: 999px;
  border: 1px solid rgba(245,200,64,0.35);
  background-color: rgba(245,200,64,0.04);
  color: rgba(237,224,196,0.65);
  font-family: "Assistant","Heebo",sans-serif;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background-color 0.2s;
  display: block;
}
.ccp-chip:hover {
  border-color: rgba(245,200,64,0.7);
  background-color: rgba(245,200,64,0.09);
  color: rgba(237,224,196,0.95);
}
@media (max-width: 767px) {
  .ccp-left  { display: none !important; }
  .ccp-right { max-width: 100% !important; padding: 0 !important; }
  .ccp-wrap  { padding: 12px 12px 60px !important; }
}
`;

// ── Suggested question chip ────────────────────────────────────────────────
function SuggestedChip({ text, onClick }: { text: string; onClick: () => void }) {
  return <button className="ccp-chip" onClick={onClick}>{text}</button>;
}

// ── Page ───────────────────────────────────────────────────────────────────
export function ChupChuPage() {
  const { t, i18n } = useTranslation('chupchu');
  const { dir } = useDirection();
  const isHe = i18n.language === 'he';
  const { loadHistory, usageThisMonth, monthlyLimit } = useChupChu();
  const { user, profile } = useAuthStore();

  const [chipQuestion, setChipQuestion] = useState('');

  useEffect(() => {
    if (user) loadHistory();
  }, [loadHistory, user]);

  const tier        = profile?.subscription_tier ?? 'free';
  const isUnlimited = tier === 'gardener_pro' || tier === 'professional';
  const isAtLimit   = !isUnlimited && monthlyLimit !== null && usageThisMonth >= monthlyLimit;

  return (
    <>
      <style>{PAGE_CSS}</style>

      {/* Grain noise overlay */}
      <div
        aria-hidden="true"
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          9997,
          pointerEvents:   'none',
          backgroundImage: NOISE_BG,
          backgroundRepeat:'repeat',
          opacity:         0.25,
        }}
      />

      {/* Page wrapper */}
      <div
        className="ccp-wrap"
        dir={dir}
        style={{
          minHeight:       '100vh',
          position:        'relative',
          backgroundImage: [
            'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.02) 0%, transparent 50%)',
            'radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.02) 0%, transparent 50%)',
            'radial-gradient(ellipse at 50% 40%, rgba(30,60,25,1) 0%, rgba(15,35,15,1) 100%)',
          ].join(', '),
          display:     'flex',
          alignItems:  'flex-start',
          padding:     '32px 28px 60px',
          gap:         '28px',
          boxSizing:   'border-box',
        }}
      >

        {/* ── LEFT PANEL ──────────────────────────────────────────────── */}
        <div
          className="ccp-left"
          style={{
            flexShrink:    0,
            width:         '300px',
            position:      'sticky',
            top:           '92px',
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            gap:           '16px',
            textAlign:     'center',
          }}
        >
          {/* Glow halo + floating image */}
          <div style={{
            position:        'relative',
            width:           '152px',
            height:          '152px',
            borderRadius:    '50%',
            background:      'radial-gradient(circle, rgba(196,134,42,0.22) 0%, rgba(196,134,42,0.06) 50%, transparent 72%)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
          }}>
            <img
              className="ccp-img"
              src="/chupchu_final.png"
              alt="צ'ופצ'ו"
              style={{
                width:     '118px',
                height:    '118px',
                objectFit: 'contain',
                filter:    'brightness(1.25) contrast(1.05) drop-shadow(0 4px 22px rgba(196,134,42,0.55))',
              }}
            />
          </div>

          {/* Name */}
          <div>
            <h2 style={{
              fontFamily: CAVEAT,
              fontSize:   '30px',
              color:      GOLD,
              margin:     '0 0 4px',
              lineHeight: 1,
            }}>
              צ'ופצ'ו
            </h2>
            <p style={{
              fontFamily: ASSIST,
              fontSize:   '13px',
              color:      `${PARCH}80`,
              margin:     0,
            }}>
              המומחה הביודינמי שלך
            </p>
          </div>

          {/* Gold divider */}
          <div style={{
            width:      '75%',
            height:     '1px',
            background: 'linear-gradient(to right, transparent, rgba(245,200,64,0.35), transparent)',
          }} />

          {/* Section label */}
          <p style={{
            fontFamily:    ASSIST,
            fontSize:      '10px',
            fontWeight:    700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase' as const,
            color:         `${PARCH}45`,
            margin:        '0 0 -4px',
            alignSelf:     dir === 'rtl' ? 'flex-end' : 'flex-start',
          }}>
            {isHe ? 'שאלות מוצעות' : 'Suggested Questions'}
          </p>

          {/* Chips */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <SuggestedChip key={i} text={q} onClick={() => setChipQuestion(q)} />
            ))}
          </div>

          {/* Usage counter — authenticated users only */}
          {user && !isUnlimited && monthlyLimit !== null && (
            <div style={{
              width:           '100%',
              padding:         '5px 14px',
              borderRadius:    '50px',
              backgroundColor: isAtLimit ? 'rgba(192,57,43,0.15)' : 'rgba(245,200,64,0.08)',
              border:          `1px solid ${isAtLimit ? 'rgba(192,57,43,0.3)' : 'rgba(245,200,64,0.2)'}`,
            }}>
              <span style={{ fontFamily: ASSIST, fontSize: '12px', fontWeight: 300, color: isAtLimit ? '#E07060' : GOLD }}>
                {t('usageCounter', { used: usageThisMonth, limit: monthlyLimit })}
              </span>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL (chat) ───────────────────────────────────────── */}
        <div
          className="ccp-right"
          style={{
            flex:     '1 1 0',
            minWidth: 0,
            maxWidth: '700px',
          }}
        >
          <ChupChuChat
            quickSend={chipQuestion}
            onQuickSendConsumed={() => setChipQuestion('')}
          />
        </div>

      </div>
    </>
  );
}
