import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpgradeModalStore } from '../../stores/upgradeModalStore';
import { useAuthStore } from '../../stores/authStore';
import { useTier } from '../../hooks/useTier';
import { api } from '../../api/client';
import { getLimits, TIER_PRICING, TIER_ORDER } from '@gina-haya/shared';
import type { SubscriptionTier } from '@gina-haya/shared';

const EARTH    = '#050d0a';
const SOIL     = '#111f18';
const GOLD     = '#00e5c3';
const SAGE     = '#4A9C68';
const CLAY     = '#9B7A48';
const PARCH    = '#b0cfbf';
const FRANK    = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST   = "'DM Sans', 'Assistant', 'Heebo', sans-serif";
const PLAYFAIR = '"Playfair Display", Georgia, serif';

const MODAL_CSS = `
@keyframes upgrade-modal-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
.upgrade-modal-card {
  animation: upgrade-modal-in 0.2s ease-out both;
}
.upgrade-modal-scroll::-webkit-scrollbar { width: 4px; }
.upgrade-modal-scroll::-webkit-scrollbar-track { background: transparent; }
.upgrade-modal-scroll::-webkit-scrollbar-thumb { background: rgba(0,229,195,0.2); border-radius: 2px; }
`;

// Feature lists: marketing copy with numbers interpolated from getLimits() so they
// stay in sync with @gina-haya/shared whenever limits change.
const _f = getLimits('free');
const _g = getLimits('gardener_pro');
const _a = getLimits('advanced');
const _p = getLimits('professional');

const TIER_FEATURES_LIST: Record<string, string[]> = {
  free: [
    'לוח ביודינמי יומי',
    `גינה אחת (עד ${_f.maxPlantsPerGarden} צמחים)`,
    `צ'ופצ'ו — ${_f.maxChupChuPerMonth} שיחות לחודש`,
    `${_f.maxVisionLooksPerMonth} ניתוחי AI לחודש`,
    'מעקב גידול אחד — טעימה',
  ],
  gardener_pro: [
    'הכל בחינמי',
    `${_g.maxGardens} גינות — עד ${_g.maxPlantsPerGarden} צמחים כל אחת`,
    `עד ${_g.maxTrackers} מעקבי גידול`,
    `${_g.maxVisionLooksPerMonth} ניתוחי AI לחודש`,
    `צ'ופצ'ו — ${_g.maxChupChuPerMonth} שיחות לחודש`,
    'אנציקלופדיה מלאה',
  ],
  advanced: [
    'הכל בגנן ביתי',
    `${_a.maxGardens} גינות — עד ${_a.maxPlantsPerGarden} צמחים כל אחת`,
    'מעקבי גידול ללא הגבלה',
    `${_a.maxVisionLooksPerMonth} ניתוחי AI לחודש`,
    `צ'ופצ'ו — ${_a.maxChupChuPerMonth} שיחות לחודש`,
    'ייצוא PDF',
  ],
  professional: [
    'הכל בגנן מתקדם',
    `${_p.maxGardens} גינות — עד ${_p.maxPlantsPerGarden} צמחים כל אחת`,
    `${_p.maxVisionLooksPerMonth} ניתוחי AI לחודש`,
    `צ'ופצ'ו — ${_p.maxChupChuPerMonth} שיחות לחודש`,
    'תמיכה מועדפת',
  ],
};

const ISRAELI_MOBILE_RE = /^05\d{8}$/;
const validatePhone = (v: string): string | null =>
  ISRAELI_MOBILE_RE.test(v) ? null : 'מספר טלפון נייד ישראלי לא תקין (לדוגמה: 0501234567)';

// Grow requires first + last name, each at least 2 characters.
const validateFullName = (v: string): string | null => {
  const words = v.trim().split(/\s+/);
  return words.length >= 2 && words.every(w => w.length >= 2)
    ? null
    : 'נדרש שם מלא — שם פרטי ושם משפחה (לפחות 2 תווים כל אחד)';
};

export function UpgradeModal() {
  if (import.meta.env.PROD && import.meta.env.VITE_LAUNCH_FREE_MODE === 'true') {
    return null;
  }

  const { close, billingPeriod, targetTier } = useUpgradeModalStore();
  const { session }              = useAuthStore();
  const { tier: currentTier }   = useTier();
  const { i18n }                 = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);

  // Grow-only checkout collection state.
  // pendingGrowTier: when set, renders the name+phone step instead of the tier grid.
  const [pendingGrowTier, setPendingGrowTier] = useState<SubscriptionTier | null>(null);
  const [fullName,    setFullName]    = useState('');
  const [fullNameErr, setFullNameErr] = useState<string | null>(null);
  const [phone,       setPhone]       = useState('');
  const [phoneError,  setPhoneError]  = useState<string | null>(null);
  // recurring: true = monthly auto-renewal (default); false = one-time trial charge.
  const [recurring,   setRecurring]   = useState(true);

  const resetCheckoutStep = () => {
    setPendingGrowTier(null);
    setFullName('');
    setFullNameErr(null);
    setPhone('');
    setPhoneError(null);
    setRecurring(true);
  };

  // Called when a tier card's upgrade button is clicked.
  const handleUpgrade = (targetTier: SubscriptionTier) => {
    if (targetTier === 'free' || !session?.access_token) return;

    if (i18n.language === 'he') {
      // Hebrew/Israeli users → Grow path.
      // Show the phone collection step; don't call the API yet.
      setPendingGrowTier(targetTier);
      return;
    }

    // Non-Hebrew → Stripe.
    setLoading(targetTier);
    api.post<{ checkoutUrl?: string }>(
      '/api/billing/create-checkout',
      { tier: targetTier },
      session.access_token,
    ).then(data => {
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    }).catch(() => {
      // silent
    }).finally(() => {
      setLoading(null);
    });
  };

  // Derive paymentMode from billingPeriod + recurring selection.
  // Annual is always one-time (no recurring interval in Grow's free integration).
  // Monthly lets the user choose between auto-renewing or a single trial charge.
  const paymentMode: 'recurring' | 'one_time_monthly' | 'one_time_annual' =
    billingPeriod === 'annual'
      ? 'one_time_annual'
      : recurring
      ? 'recurring'
      : 'one_time_monthly';

  // Called when user confirms name + phone and clicks pay (Grow path only).
  const handleGrowConfirm = async () => {
    if (!pendingGrowTier || !session?.access_token) return;

    const nameErr  = validateFullName(fullName);
    const phoneErr = validatePhone(phone);
    if (nameErr)  { setFullNameErr(nameErr);  return; }
    if (phoneErr) { setPhoneError(phoneErr);  return; }

    setLoading(pendingGrowTier);
    try {
      const data = await api.post<{ paymentUrl?: string }>(
        '/api/billing/grow/create-payment',
        {
          tier:        pendingGrowTier,
          paymentMode,
          // Keep recurring boolean for any other code that may read it
          recurring:   paymentMode === 'recurring',
          fullName:    fullName.trim(),
          phone,
        },
        session.access_token,
      );
      if (data.paymentUrl) window.location.href = data.paymentUrl;
    } catch {
      // silent
    } finally {
      setLoading(null);
    }
  };

  const isFullNameValid = validateFullName(fullName) === null;
  const isPhoneValid    = ISRAELI_MOBILE_RE.test(phone);
  const isFormValid     = isFullNameValid && isPhoneValid;

  return (
    <>
      <style>{MODAL_CSS}</style>

      {/* Backdrop */}
      <div
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          60,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          padding:         '16px',
          backgroundColor: 'rgba(0,0,0,0.9)',
        }}
        onClick={e => { if (e.target === e.currentTarget) { resetCheckoutStep(); close(); } }}
      >
        <div
          className="upgrade-modal-card upgrade-modal-scroll"
          style={{
            position:        'relative',
            width:           '100%',
            // Narrow for confirmation + checkout steps; wide only for the fallback tier-picker grid
            maxWidth:        (!targetTier && !pendingGrowTier) ? '860px' : '500px',
            maxHeight:       '90vh',
            overflowY:       'auto',
            backgroundColor: SOIL,
            border:          '1px solid rgba(0,229,195,0.2)',
            borderRadius:    '16px',
            transition:      'max-width 0.2s ease',
          }}
        >
          {/* Header */}
          <div style={{
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'space-between',
            padding:         '24px 28px 20px',
            borderBottom:    '1px solid rgba(0,229,195,0.1)',
            position:        'sticky',
            top:             0,
            backgroundColor: SOIL,
            zIndex:          1,
          }}>
            <div>
              <h2 style={{
                fontFamily: FRANK,
                fontWeight: 700,
                fontSize:   '22px',
                color:      GOLD,
                margin:     '0 0 4px',
              }}>
                {pendingGrowTier
                  ? 'השלמת הרכישה'
                  : targetTier
                  ? 'אישור שדרוג'
                  : 'שדרג את התוכנית שלך'}
              </h2>
              <p style={{
                fontFamily: ASSIST,
                fontSize:   '13px',
                color:      `${PARCH}55`,
                margin:     0,
              }}>
                {pendingGrowTier
                  ? billingPeriod === 'annual'
                    ? `תוכנית ${getLimits(pendingGrowTier).displayNameHe} — ₪${TIER_PRICING[pendingGrowTier]?.annual} / שנה`
                    : `תוכנית ${getLimits(pendingGrowTier).displayNameHe} — ₪${TIER_PRICING[pendingGrowTier]?.monthly} / חודש`
                  : targetTier
                  ? `${getLimits(currentTier).displayNameHe} → ${getLimits(targetTier).displayNameHe}`
                  : 'בחר את התוכנית המתאימה לך'}
              </p>
            </div>
            {/* Close button */}
            <button
              onClick={() => { resetCheckoutStep(); close(); }}
              aria-label="סגור"
              style={{
                width:           '34px',
                height:          '34px',
                borderRadius:    '50%',
                backgroundColor: 'rgba(0,229,195,0.1)',
                border:          '1px solid rgba(0,229,195,0.25)',
                color:           GOLD,
                fontSize:        '18px',
                cursor:          'pointer',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                transition:      'background-color 0.15s',
                flexShrink:      0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,229,195,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,229,195,0.1)'; }}
            >
              ×
            </button>
          </div>

          {/* ── Step 1: Order confirmation (when targetTier is pre-set) ── */}
          {!pendingGrowTier && targetTier ? (
            <div dir="rtl" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Current → New plan summary */}
              <div style={{
                display:       'flex',
                flexDirection: 'column',
                gap:           '10px',
              }}>
                {/* Current plan row */}
                <div style={{
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'space-between',
                  padding:         '12px 16px',
                  borderRadius:    '8px',
                  background:      'rgba(255,255,255,0.03)',
                  border:          '1px solid rgba(176,207,191,0.1)',
                }}>
                  <span style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}66` }}>
                    תוכנית נוכחית
                  </span>
                  <span style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}88`, fontWeight: 600 }}>
                    {getLimits(currentTier).displayNameHe}
                  </span>
                </div>

                {/* Arrow */}
                <div style={{ textAlign: 'center', color: GOLD, fontSize: '18px', lineHeight: 1 }}>↓</div>

                {/* New plan row */}
                <div style={{
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'space-between',
                  padding:         '14px 16px',
                  borderRadius:    '10px',
                  background:      'rgba(0,229,195,0.07)',
                  border:          `1.5px solid ${GOLD}99`,
                }}>
                  <span style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}CC` }}>
                    שדרוג ל
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                    <span style={{ fontFamily: FRANK, fontSize: '16px', color: GOLD, fontWeight: 700 }}>
                      {getLimits(targetTier).displayNameHe}
                    </span>
                    <span style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}99` }}>
                      {billingPeriod === 'annual'
                        ? `₪${TIER_PRICING[targetTier]?.annual} / שנה`
                        : `₪${TIER_PRICING[targetTier]?.monthly} / חודש`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Billing period note */}
              {billingPeriod === 'annual' && (
                <p style={{ fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}66`, margin: 0 }}>
                  תשלום שנתי חד פעמי — ללא חידוש אוטומטי
                </p>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => close()}
                  style={{
                    flex:            1,
                    padding:         '11px',
                    borderRadius:    '8px',
                    border:          '1px solid rgba(0,229,195,0.15)',
                    backgroundColor: 'transparent',
                    fontFamily:      ASSIST,
                    fontSize:        '13px',
                    color:           `${PARCH}77`,
                    cursor:          'pointer',
                  }}
                >
                  ביטול
                </button>
                <button
                  onClick={() => handleUpgrade(targetTier as SubscriptionTier)}
                  disabled={loading === targetTier}
                  style={{
                    flex:            2,
                    padding:         '11px',
                    borderRadius:    '8px',
                    border:          'none',
                    backgroundColor: loading !== targetTier ? GOLD : `${GOLD}44`,
                    fontFamily:      FRANK,
                    fontWeight:      600,
                    fontSize:        '15px',
                    color:           EARTH,
                    cursor:          loading !== targetTier ? 'pointer' : 'default',
                    transition:      'filter 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (loading !== targetTier)
                      (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)';
                  }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                >
                  {loading === targetTier ? '...' : 'המשך לתשלום'}
                </button>
              </div>
            </div>

          ) : /* ── Step 2: Name + phone collection step (Grow / Hebrew only) ── */
          pendingGrowTier ? (
            <div dir="rtl" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}CC`, margin: 0 }}>
                לצורך עיבוד התשלום נדרשים שם מלא ומספר טלפון נייד ישראלי.
              </p>

              {/* Full name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor="grow-fullname"
                  style={{ fontFamily: ASSIST, fontSize: '13px', fontWeight: 600, color: PARCH }}
                >
                  שם מלא
                </label>
                <input
                  id="grow-fullname"
                  type="text"
                  dir="rtl"
                  placeholder="ישראל ישראלי"
                  value={fullName}
                  onChange={e => {
                    setFullName(e.target.value);
                    if (e.target.value.length > 0) setFullNameErr(validateFullName(e.target.value));
                    else setFullNameErr(null);
                  }}
                  onBlur={() => {
                    if (fullName.length > 0) setFullNameErr(validateFullName(fullName));
                  }}
                  style={{
                    width:           '100%',
                    padding:         '11px 14px',
                    borderRadius:    '8px',
                    border:          fullNameErr
                      ? '1px solid rgba(192,57,43,0.7)'
                      : isFullNameValid && fullName.length > 0
                      ? `1px solid ${SAGE}88`
                      : '1px solid rgba(0,229,195,0.2)',
                    backgroundColor: 'rgba(9,20,16,0.6)',
                    fontFamily:      ASSIST,
                    fontSize:        '15px',
                    color:           PARCH,
                    outline:         'none',
                    boxSizing:       'border-box',
                  }}
                />
                {fullNameErr && (
                  <p style={{ fontFamily: ASSIST, fontSize: '12px', color: '#C0372A', margin: 0 }}>
                    {fullNameErr}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor="grow-phone"
                  style={{ fontFamily: ASSIST, fontSize: '13px', fontWeight: 600, color: PARCH }}
                >
                  מספר טלפון נייד
                </label>
                <input
                  id="grow-phone"
                  type="tel"
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="0501234567"
                  value={phone}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone(v);
                    if (v.length > 0) setPhoneError(validatePhone(v));
                    else setPhoneError(null);
                  }}
                  onBlur={() => {
                    if (phone.length > 0) setPhoneError(validatePhone(phone));
                  }}
                  style={{
                    width:           '100%',
                    padding:         '11px 14px',
                    borderRadius:    '8px',
                    border:          phoneError
                      ? '1px solid rgba(192,57,43,0.7)'
                      : isPhoneValid
                      ? `1px solid ${SAGE}88`
                      : '1px solid rgba(0,229,195,0.2)',
                    backgroundColor: 'rgba(9,20,16,0.6)',
                    fontFamily:      ASSIST,
                    fontSize:        '15px',
                    color:           PARCH,
                    outline:         'none',
                    boxSizing:       'border-box',
                    letterSpacing:   '0.06em',
                  }}
                />
                {phoneError && (
                  <p style={{ fontFamily: ASSIST, fontSize: '12px', color: '#C0372A', margin: 0 }}>
                    {phoneError}
                  </p>
                )}
              </div>

              {billingPeriod === 'annual' ? (
                /* ── Annual: single disclosure, no choice needed ── */
                <div style={{
                  padding:      '12px 14px',
                  borderRadius: '8px',
                  border:       `1.5px solid ${GOLD}99`,
                  background:   'rgba(0,229,195,0.07)',
                }}>
                  <p style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}BB`, margin: 0, lineHeight: 1.55 }}>
                    מנוי שנתי — תשלום חד פעמי מראש של{' '}
                    <strong style={{ color: GOLD }}>
                      ₪{TIER_PRICING[pendingGrowTier]?.annual}
                    </strong>{' '}
                    לשנה, ללא חידוש אוטומטי. נשלח לך תזכורת לפני שהמנוי יסתיים.
                  </p>
                </div>
              ) : (
                /* ── Monthly: two mutually exclusive radio cards ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {([
                    {
                      value:    true,
                      title:    'מנוי חודשי מתחדש',
                      subtitle: `התשלום של ₪${TIER_PRICING[pendingGrowTier]?.monthly} יתבצע אוטומטית כל חודש עד לביטול המנוי`,
                    },
                    {
                      value:    false,
                      title:    'תשלום חד פעמי',
                      subtitle: `נסו את התוכנית לחודש אחד (₪${TIER_PRICING[pendingGrowTier]?.monthly}), ללא חידוש אוטומטי`,
                    },
                  ] as const).map(opt => {
                    const active = recurring === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setRecurring(opt.value)}
                        style={{
                          display:         'flex',
                          alignItems:      'flex-start',
                          gap:             '12px',
                          padding:         '12px 14px',
                          borderRadius:    '8px',
                          border:          active
                            ? `1.5px solid ${GOLD}99`
                            : '1px solid rgba(0,229,195,0.15)',
                          background:      active
                            ? 'rgba(0,229,195,0.07)'
                            : 'rgba(9,20,16,0.4)',
                          cursor:          'pointer',
                          textAlign:       'right',
                          width:           '100%',
                          transition:      'border-color 0.15s, background 0.15s',
                        }}
                      >
                        {/* Radio dot */}
                        <span style={{
                          flexShrink:   0,
                          marginTop:    '3px',
                          width:        '16px',
                          height:       '16px',
                          borderRadius: '50%',
                          border:       active ? `5px solid ${GOLD}` : '2px solid rgba(0,229,195,0.35)',
                          background:   'transparent',
                          display:      'block',
                          boxSizing:    'border-box',
                          transition:   'border 0.15s',
                        }} />
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{
                            fontFamily: ASSIST,
                            fontWeight: 600,
                            fontSize:   '13px',
                            color:      active ? GOLD : PARCH,
                            transition: 'color 0.15s',
                          }}>
                            {opt.title}
                          </span>
                          <span style={{
                            fontFamily: ASSIST,
                            fontSize:   '12px',
                            color:      `${PARCH}88`,
                            lineHeight: 1.5,
                          }}>
                            {opt.subtitle}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={resetCheckoutStep}
                  style={{
                    flex:            1,
                    padding:         '11px',
                    borderRadius:    '8px',
                    border:          '1px solid rgba(0,229,195,0.15)',
                    backgroundColor: 'transparent',
                    fontFamily:      ASSIST,
                    fontSize:        '13px',
                    color:           `${PARCH}77`,
                    cursor:          'pointer',
                  }}
                >
                  חזרה
                </button>
                <button
                  onClick={handleGrowConfirm}
                  disabled={!isFormValid || loading === pendingGrowTier}
                  style={{
                    flex:            2,
                    padding:         '11px',
                    borderRadius:    '8px',
                    border:          'none',
                    backgroundColor: isFormValid && loading !== pendingGrowTier ? GOLD : `${GOLD}44`,
                    fontFamily:      FRANK,
                    fontWeight:      600,
                    fontSize:        '14px',
                    color:           EARTH,
                    cursor:          isFormValid && loading !== pendingGrowTier ? 'pointer' : 'default',
                    transition:      'filter 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (isFormValid && loading !== pendingGrowTier)
                      (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)';
                  }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                >
                  {loading === pendingGrowTier ? '...' : 'לתשלום'}
                </button>
              </div>
            </div>
          ) : (
            /* ── Tier cards grid (default view) ── */
            <div style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap:                 '14px',
              padding:             '24px 28px',
            }}>
              {TIER_ORDER.map(tier => {
                const isCurrent   = tier === currentTier;
                const isPro       = tier === 'gardener_pro';
                const isDowngrade = TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(currentTier);

                return (
                  <div
                    key={tier}
                    style={{
                      position:      'relative',
                      borderRadius:  '12px',
                      padding:       '20px',
                      display:       'flex',
                      flexDirection: 'column',
                      gap:           '12px',
                      background:    'rgba(9,20,16,0.6)',
                      border:        isCurrent
                        ? `2px solid ${SAGE}88`
                        : isPro
                        ? `2px solid ${GOLD}`
                        : '1px solid rgba(0,229,195,0.15)',
                      transform:     isPro ? 'scale(1.02)' : 'none',
                    }}
                  >
                    {/* Badges */}
                    {isPro && (
                      <span style={{
                        position:        'absolute',
                        top:             '-12px',
                        left:            '50%',
                        transform:       'translateX(-50%)',
                        fontFamily:      FRANK,
                        fontWeight:      700,
                        fontSize:        '11px',
                        padding:         '3px 12px',
                        borderRadius:    '50px',
                        backgroundColor: GOLD,
                        color:           EARTH,
                        whiteSpace:      'nowrap',
                      }}>
                        הכי פופולרי
                      </span>
                    )}
                    {isCurrent && (
                      <span style={{
                        position:        'absolute',
                        top:             '-12px',
                        left:            '50%',
                        transform:       'translateX(-50%)',
                        fontFamily:      ASSIST,
                        fontWeight:      600,
                        fontSize:        '11px',
                        padding:         '3px 12px',
                        borderRadius:    '50px',
                        backgroundColor: 'rgba(74,156,104,0.3)',
                        border:          `1px solid ${SAGE}44`,
                        color:           SAGE,
                        whiteSpace:      'nowrap',
                      }}>
                        התוכנית הנוכחית שלך
                      </span>
                    )}

                    {/* Name & price */}
                    <div>
                      <p style={{
                        fontFamily: FRANK,
                        fontWeight: 700,
                        fontSize:   '16px',
                        color:      isPro ? GOLD : PARCH,
                        margin:     '0 0 4px',
                      }}>
                        {getLimits(tier).displayNameHe}
                      </p>
                      <p style={{
                        fontFamily: PLAYFAIR,
                        fontStyle:  'italic',
                        fontSize:   '15px',
                        color:      isPro ? GOLD : `${PARCH}BB`,
                        margin:     0,
                      }}>
                        {TIER_PRICING[tier]?.monthly != null ? `₪${TIER_PRICING[tier].monthly} / חודש` : 'חינם'}
                      </p>
                    </div>

                    {/* Features */}
                    <ul style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px', margin: 0, padding: 0, listStyle: 'none' }}>
                      {TIER_FEATURES_LIST[tier].map(feature => (
                        <li key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontFamily: ASSIST, fontSize: '12px', color: `${PARCH}AA` }}>
                          <span style={{ color: SAGE, flexShrink: 0, marginTop: '1px' }}>✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {tier === 'free' || isCurrent ? (
                      <div style={{
                        padding:         '10px',
                        borderRadius:    '8px',
                        textAlign:       'center',
                        fontFamily:      ASSIST,
                        fontSize:        '13px',
                        color:           `${PARCH}44`,
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border:          '1px solid rgba(255,255,255,0.06)',
                      }}>
                        {isCurrent ? 'תוכנית נוכחית' : 'חינמי'}
                      </div>
                    ) : isDowngrade ? (
                      <div style={{
                        padding:         '10px',
                        borderRadius:    '8px',
                        textAlign:       'center',
                        fontFamily:      ASSIST,
                        fontSize:        '13px',
                        color:           `${PARCH}33`,
                        backgroundColor: 'rgba(255,255,255,0.03)',
                      }}>
                        לא זמין
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(tier)}
                        disabled={loading === tier}
                        style={{
                          width:           '100%',
                          padding:         '10px',
                          borderRadius:    '8px',
                          border:          isPro ? 'none' : `1px solid ${GOLD}55`,
                          backgroundColor: isPro ? GOLD : 'transparent',
                          fontFamily:      FRANK,
                          fontWeight:      600,
                          fontSize:        '13px',
                          color:           isPro ? EARTH : GOLD,
                          cursor:          loading === tier ? 'default' : 'pointer',
                          opacity:         loading === tier ? 0.7 : 1,
                          transition:      'filter 0.15s, background-color 0.15s',
                        }}
                        onMouseEnter={e => {
                          if (loading !== tier) {
                            const el = e.currentTarget as HTMLElement;
                            if (isPro) el.style.filter = 'brightness(1.1)';
                            else el.style.backgroundColor = 'rgba(0,229,195,0.1)';
                          }
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.filter = 'none';
                          if (!isPro) el.style.backgroundColor = 'transparent';
                        }}
                      >
                        {loading === tier ? '...' : 'שדרג עכשיו'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
