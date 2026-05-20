import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { ChupChuChat } from '../components/chupchu/ChupChuChat';
import { useChupChu } from '../hooks/useChupChu';
import { useAuthStore } from '../stores/authStore';

// ── Design tokens ──────────────────────────────────────────────────────────
const NIGHT      = '#050d0a';
const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const BIO_VIOLET = '#a78bfa';
const TEXT       = '#e8f5ee';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";
const CAVEAT     = "'Caveat', cursive";

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
  border: 1px solid rgba(0,229,195,0.2);
  background-color: rgba(0,229,195,0.04);
  color: rgba(176,207,191,0.7);
  font-family: 'DM Sans','Assistant','Heebo',sans-serif;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background-color 0.2s;
  display: block;
}
.ccp-chip:hover {
  border-color: rgba(0,229,195,0.5);
  background-color: rgba(0,229,195,0.08);
  color: #e8f5ee;
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

      {/* Page wrapper */}
      <div
        className="ccp-wrap"
        dir={dir}
        style={{
          minHeight:       '100vh',
          position:        'relative',
          backgroundColor: NIGHT,
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
            background:      'radial-gradient(circle, rgba(0,229,195,0.18) 0%, rgba(0,229,195,0.05) 50%, transparent 72%)',
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
              color:      BIO_CYAN,
              margin:     '0 0 4px',
              lineHeight: 1,
            }}>
              צ'ופצ'ו
            </h2>
            <p style={{
              fontFamily: DM_SANS,
              fontSize:   '13px',
              color:      MUTED,
              margin:     0,
            }}>
              המומחה הביודינמי שלך
            </p>
          </div>

          {/* Divider */}
          <div style={{
            width:      '75%',
            height:     '1px',
            background: 'linear-gradient(to right, transparent, rgba(0,229,195,0.25), transparent)',
          }} />

          {/* Section label */}
          <p style={{
            fontFamily:    DM_SANS,
            fontSize:      '10px',
            fontWeight:    700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase' as const,
            color:         MUTED,
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
              backgroundColor: isAtLimit ? 'rgba(255,92,138,0.1)' : 'rgba(0,229,195,0.07)',
              border:          `1px solid ${isAtLimit ? 'rgba(255,92,138,0.3)' : 'rgba(0,229,195,0.2)'}`,
            }}>
              <span style={{ fontFamily: DM_SANS, fontSize: '12px', fontWeight: 300, color: isAtLimit ? '#ff5c8a' : BIO_CYAN }}>
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
