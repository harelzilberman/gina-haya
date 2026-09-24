import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useUpgradeModalStore } from '../stores/upgradeModalStore';
import { useToastStore } from '../stores/toastStore';
import { getLimits, TIER_PRICING, TIER_ORDER } from '@gina-haya/shared';
import { savePurchaseIntent, readPurchaseIntent, clearPurchaseIntent } from '../utils/purchaseIntent';

const NIGHT      = '#050d0a';
const NIGHT_MID  = '#091410';
const NIGHT_CARD = '#111f18';
const NIGHT_LIFT = '#0e1e17';
const BIO_CYAN   = '#00e5c3';
const BIO_LIME   = '#aaff00';
const TEXT       = '#e8f5ee';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const ASST       = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const PAGE_CSS = `
@keyframes pricingFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes toastIn {
  0%   { opacity: 0; transform: translateX(-50%) translateY(12px); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.pricing-card { transition: transform 0.2s, box-shadow 0.2s; }
.pricing-card:hover { transform: translateY(-5px); box-shadow: 0 20px 60px rgba(0,229,195,0.1) !important; }
.pricing-feature-row { display: flex; align-items: flex-start; gap: 8px; padding: 5px 0; font-family: ${ASST}; font-size: 13px; line-height: 1.45; }
.pricing-toggle-pill { padding: 7px 20px; border-radius: 99px; border: none; cursor: pointer; font-family: ${ASST}; font-size: 13px; font-weight: 600; transition: background 0.2s, color 0.2s; }
.faq-item { border-bottom: 1px solid rgba(0,229,195,0.08); }
.faq-answer { font-family: ${ASST}; font-size: 14px; color: #b0cfbf; line-height: 1.7; padding: 0 0 16px; }
`;

type ActiveTier = 'free' | 'gardener_pro' | 'advanced' | 'professional';

interface Feature { icon: string; text: string; dim?: boolean }

// Limit constants pulled once at module level — shared for both languages.
const FREE_L   = getLimits('free');
const GP_L     = getLimits('gardener_pro');
const ADV_L    = getLimits('advanced');
const PRO_L    = getLimits('professional');

function FeatureRow({ icon, text, dim }: Feature) {
  const color =
    icon === '✓' ? BIO_CYAN :
    icon === '✦' ? BIO_LIME :
    icon === '➕' ? BIO_LIME :
    'rgba(176,207,191,0.25)';
  return (
    <div className="pricing-feature-row">
      <span style={{ color, flexShrink: 0, fontWeight: 700, fontSize: '14px', lineHeight: '1.3', marginTop: '1px' }}>{icon}</span>
      <span style={{ color: dim ? 'rgba(176,207,191,0.3)' : TEXT_MID }}>{text}</span>
    </div>
  );
}

function ComingSoonToast({ visible, text }: { visible: boolean; text: string }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '36px', left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: NIGHT_LIFT,
      border: `1px solid rgba(0,229,195,0.3)`,
      borderRadius: '12px',
      padding: '12px 24px',
      fontFamily: ASST, fontSize: '14px', fontWeight: 600,
      color: BIO_CYAN,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      animation: 'toastIn 0.25s ease both',
      whiteSpace: 'nowrap',
    }}>
      {text}
    </div>
  );
}

export function PricingPage() {
  const { profile, user } = useAuthStore();
  const { open: openUpgradeModal } = useUpgradeModalStore();
  const { show: showGlobalToast } = useToastStore();
  const navigate = useNavigate();
  const { i18n, t } = useTranslation('billing');
  const isHe = i18n.language === 'he';
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const currentTier = (profile?.subscription_tier ?? 'free') as ActiveTier;

  // Derive tier display name based on language
  function tierName(tier: string): string {
    if (isHe) return getLimits(tier as ActiveTier).displayNameHe;
    return t(`tierNames.${tier}`);
  }

  // Feature lists — generated here so t() interpolation runs at render time
  const FREE_FEATURES: Feature[] = [
    { icon: '✓', text: t('pricing.features.dailyCalendar') },
    { icon: '✓', text: t('pricing.features.moonPhase') },
    { icon: '✓', text: t('pricing.features.oneGarden', { plants: FREE_L.maxPlantsPerGarden }) },
    { icon: '✓', text: t('pricing.features.taskBoard') },
    { icon: '✓', text: t('pricing.features.articles') },
    { icon: '✓', text: t('pricing.features.chupchu', { chats: FREE_L.maxChupChuPerMonth }) },
    { icon: '✦', text: t('pricing.features.trackerPreview') },
    { icon: '✦', text: t('pricing.features.aiAnalyses', { analyses: FREE_L.maxVisionLooksPerMonth }) },
    { icon: '✗', text: t('pricing.features.moreTrackers'), dim: true },
    { icon: '✗', text: t('pricing.features.annualPlan'), dim: true },
    { icon: '✗', text: t('pricing.features.encyclopedia'), dim: true },
  ];

  const GP_FEATURES: Feature[] = [
    { icon: '✓', text: t('pricing.features.allFree') },
    { icon: '✓', text: t('pricing.features.gardens', { gardens: GP_L.maxGardens, plants: GP_L.maxPlantsPerGarden }) },
    { icon: '✓', text: t('pricing.features.upToTrackers', { trackers: GP_L.maxTrackers }) },
    { icon: '✓', text: t('pricing.features.aiAnalyses', { analyses: GP_L.maxVisionLooksPerMonth }) },
    { icon: '✓', text: t('pricing.features.chupchu', { chats: GP_L.maxChupChuPerMonth }) },
    { icon: '✓', text: t('pricing.features.annualPlan') },
    { icon: '✓', text: t('pricing.features.encyclopedia') },
    { icon: '✗', text: t('pricing.features.pdfExport'), dim: true },
  ];

  const ADV_FEATURES: Feature[] = [
    { icon: '✓', text: t('pricing.features.allGardenerPro') },
    { icon: '✓', text: t('pricing.features.gardens', { gardens: ADV_L.maxGardens, plants: ADV_L.maxPlantsPerGarden }) },
    { icon: '✓', text: t('pricing.features.unlimitedTrackers') },
    { icon: '✓', text: t('pricing.features.aiAnalyses', { analyses: ADV_L.maxVisionLooksPerMonth }) },
    { icon: '✓', text: t('pricing.features.chupchu', { chats: ADV_L.maxChupChuPerMonth }) },
    { icon: '✓', text: t('pricing.features.pdfExport') },
    { icon: '✓', text: t('pricing.features.earlyAccess') },
  ];

  const PRO_FEATURES: Feature[] = [
    { icon: '✓', text: t('pricing.features.allAdvanced') },
    { icon: '✓', text: t('pricing.features.gardens', { gardens: PRO_L.maxGardens, plants: PRO_L.maxPlantsPerGarden }) },
    { icon: '✓', text: t('pricing.features.unlimitedTrackers') },
    { icon: '✓', text: t('pricing.features.aiAnalyses', { analyses: PRO_L.maxVisionLooksPerMonth }) },
    { icon: '✓', text: t('pricing.features.chupchu', { chats: PRO_L.maxChupChuPerMonth }) },
    { icon: '✓', text: t('pricing.features.pdfExport') },
    { icon: '✓', text: t('pricing.features.earlyAccess') },
    { icon: '✓', text: t('pricing.features.prioritySupport') },
    { icon: '✓', text: t('pricing.features.advancedStats') },
  ];

  const FAQ_ITEMS = [
    { q: t('pricing.faq.q1'), a: t('pricing.faq.a1') },
    { q: t('pricing.faq.q2'), a: t('pricing.faq.a2') },
    { q: t('pricing.faq.q3'), a: t('pricing.faq.a3') },
    { q: t('pricing.faq.q4'), a: t('pricing.faq.a4') },
    { q: t('pricing.faq.q5'), a: t('pricing.faq.a5') },
  ];

  // After login/signup (including email confirmation), process any pending purchase intent.
  useEffect(() => {
    if (!user) return;
    const intent = readPurchaseIntent();
    if (!intent) return;

    clearPurchaseIntent();

    const currentIdx = (TIER_ORDER as ReadonlyArray<string>).indexOf(currentTier);
    const intentIdx  = (TIER_ORDER as ReadonlyArray<string>).indexOf(intent.tier);

    if (intentIdx !== -1 && currentIdx !== -1 && currentIdx >= intentIdx) {
      showGlobalToast(
        isHe ? 'כבר יש לך את התוכנית הזו' : 'You already have this plan',
        'info',
      );
      return;
    }

    openUpgradeModal('purchase_intent', intent.billingPeriod, intent.tier);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function showToast() {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }

  function TierBadge({ tier }: { tier: ActiveTier }) {
    if (currentTier !== tier || !profile) return null;
    return (
      <div style={{
        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
        background: BIO_CYAN, color: NIGHT,
        fontFamily: isHe ? FRANK : ASST, fontSize: '11px', fontWeight: 700,
        padding: '3px 12px', borderRadius: '99px',
        whiteSpace: 'nowrap',
      }}>
        {t('pricing.currentPlanBadge')}
      </div>
    );
  }

  function annualMonthly(tier: string): number {
    return Math.round((TIER_PRICING[tier]?.annual ?? 0) / 12);
  }
  function annualSavings(tier: string): number {
    const p = TIER_PRICING[tier];
    if (!p?.monthly || !p?.annual) return 0;
    return p.monthly * 12 - p.annual;
  }

  const handleUpgradeClick = (tier: string) => {
    if (!user) {
      savePurchaseIntent({ tier, billingPeriod: isAnnual ? 'annual' : 'monthly', returnTo: '/pricing' });
      navigate('/login?next=/pricing');
      return;
    }
    openUpgradeModal('pricing_page', isAnnual ? 'annual' : 'monthly', tier);
  };

  const upgradeBtn = (tier: string) => (
    <button
      onClick={() => handleUpgradeClick(tier)}
      style={{
        display: 'block', width: '100%',
        fontFamily: isHe ? FRANK : ASST, fontSize: '15px', fontWeight: 700,
        color: NIGHT, background: BIO_CYAN,
        padding: '13px', borderRadius: '100px',
        border: 'none', cursor: 'pointer', transition: 'filter 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
    >
      {t('pricing.upgradeTo', { name: tierName(tier) })}
    </button>
  );

  const headingFont = isHe ? FRANK : ASST;

  return (
    <>
      <style>{PAGE_CSS}</style>
      <ComingSoonToast visible={toastVisible} text={t('pricing.comingSoonToast')} />

      <div dir={isHe ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: NIGHT, fontFamily: ASST }}>

        {/* ── Launch free mode banner ── */}
        <div style={{
          maxWidth: '1160px', margin: '0 auto',
          padding: '24px 20px 0',
          animation: 'pricingFadeIn 0.5s ease both',
        }}>
          <div style={{
            background: 'rgba(0,229,195,0.07)',
            border: '1px solid rgba(0,229,195,0.2)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            marginBottom: '24px',
            fontSize: '15px',
            color: BIO_CYAN,
            fontWeight: 600,
          }}>
            {t('pricing.launchBanner')}
          </div>
        </div>

        {/* ── Header ── */}
        <div style={{
          background: `linear-gradient(180deg, ${NIGHT_MID} 0%, ${NIGHT} 100%)`,
          padding: '60px 24px 48px',
          textAlign: 'center',
          animation: 'pricingFadeIn 0.5s ease both',
        }}>
          <h1 style={{
            fontFamily: headingFont, fontSize: 'clamp(28px, 5vw, 44px)',
            color: BIO_CYAN, margin: '0 0 12px', fontWeight: 700, lineHeight: 1.2,
          }}>
            {t('pricing.header')}
          </h1>
          <p style={{
            fontFamily: ASST, fontSize: '16px',
            color: TEXT_MID, margin: '0 0 28px',
          }}>
            {t('pricing.subtitle')}
          </p>

          {/* Toggle */}
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: NIGHT_CARD, borderRadius: '99px',
            padding: '4px', gap: '2px',
            border: '1px solid rgba(0,229,195,0.12)',
          }}>
            <button
              className="pricing-toggle-pill"
              onClick={() => setIsAnnual(false)}
              style={{
                background: !isAnnual ? BIO_CYAN : 'transparent',
                color: !isAnnual ? NIGHT : MUTED,
              }}
            >
              {t('pricing.toggleMonthly')}
            </button>
            <button
              className="pricing-toggle-pill"
              onClick={() => setIsAnnual(true)}
              style={{
                background: isAnnual ? BIO_CYAN : 'transparent',
                color: isAnnual ? NIGHT : MUTED,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {t('pricing.toggleAnnual')}
              <span style={{
                background: BIO_LIME, color: NIGHT,
                fontSize: '10px', fontWeight: 700,
                padding: '2px 7px', borderRadius: '99px',
              }}>
                {t('pricing.toggleSave')}
              </span>
            </button>
          </div>
        </div>

        {/* ── Tier cards ── */}
        <div style={{
          maxWidth: '1160px', margin: '0 auto',
          padding: '0 20px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '16px',
          animation: 'pricingFadeIn 0.5s ease 0.1s both',
        }}>

          {/* ── Free ── */}
          <div
            className="pricing-card"
            style={{
              position: 'relative',
              background: NIGHT_CARD,
              border: currentTier === 'free' && profile ? `2px solid ${BIO_CYAN}` : '1px solid rgba(0,229,195,0.1)',
              borderRadius: '16px', padding: '28px 24px',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <TierBadge tier="free" />
            <div style={{ fontFamily: headingFont, fontSize: '22px', color: TEXT, fontWeight: 700, marginBottom: isHe ? '4px' : '20px' }}>
              {tierName('free')}
            </div>
            {isHe && (
              <div style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginBottom: '20px' }}>
                Free
              </div>
            )}
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontFamily: headingFont, fontSize: '38px', color: BIO_CYAN, fontWeight: 700 }}>₪0</span>
              <span style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginRight: '6px' }}>{t('pricing.forever')}</span>
            </div>
            <div style={{ flex: 1, marginBottom: '24px' }}>
              {FREE_FEATURES.map((f, i) => <FeatureRow key={i} {...f} />)}
            </div>
            <Link
              to="/signup"
              style={{
                display: 'block', textAlign: 'center',
                fontFamily: isHe ? FRANK : ASST, fontSize: '15px', fontWeight: 700,
                color: NIGHT, background: BIO_CYAN,
                padding: '13px', borderRadius: '100px',
                textDecoration: 'none', transition: 'filter 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              {t('pricing.startFree')}
            </Link>
          </div>

          {/* ── Gardener Pro — featured ── */}
          <div
            className="pricing-card"
            style={{
              position: 'relative',
              background: `linear-gradient(145deg, ${NIGHT_LIFT} 0%, ${NIGHT_CARD} 100%)`,
              border: `2px solid ${BIO_CYAN}`,
              borderRadius: '16px', padding: '28px 24px',
              display: 'flex', flexDirection: 'column',
              boxShadow: `0 8px 40px rgba(0,229,195,0.15)`,
            }}
          >
            <TierBadge tier="gardener_pro" />
            {currentTier !== 'gardener_pro' && (
              <div style={{
                position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                background: `linear-gradient(90deg, ${BIO_CYAN}, ${BIO_LIME})`,
                color: NIGHT,
                fontFamily: isHe ? FRANK : ASST, fontSize: '11px', fontWeight: 700,
                padding: '3px 14px', borderRadius: '99px',
                whiteSpace: 'nowrap',
              }}>
                {t('pricing.mostPopular')}
              </div>
            )}
            <div style={{ fontFamily: headingFont, fontSize: '22px', color: BIO_CYAN, fontWeight: 700, marginBottom: isHe ? '4px' : '20px' }}>
              {tierName('gardener_pro')}
            </div>
            {isHe && (
              <div style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginBottom: '20px' }}>
                Gardener Pro
              </div>
            )}
            <div style={{ marginBottom: isAnnual ? '8px' : '24px' }}>
              <span style={{ fontFamily: headingFont, fontSize: '38px', color: BIO_CYAN, fontWeight: 700 }}>
                ₪{isAnnual ? annualMonthly('gardener_pro') : TIER_PRICING.gardener_pro.monthly}
              </span>
              <span style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginRight: '6px' }}>{t('pricing.perMonth')}</span>
            </div>
            {isAnnual && (
              <div style={{ fontFamily: ASST, fontSize: '12px', color: MUTED, marginBottom: '16px' }}>
                {t('pricing.annualTotal', { annual: TIER_PRICING.gardener_pro.annual, savings: annualSavings('gardener_pro') })}
              </div>
            )}
            <div style={{ flex: 1, marginBottom: '24px' }}>
              {GP_FEATURES.map((f, i) => <FeatureRow key={i} {...f} />)}
            </div>
            {upgradeBtn('gardener_pro')}
          </div>

          {/* ── Advanced ── */}
          <div
            className="pricing-card"
            style={{
              position: 'relative',
              background: NIGHT_CARD,
              border: currentTier === 'advanced' && profile ? `2px solid ${BIO_CYAN}` : '1px solid rgba(0,229,195,0.15)',
              borderRadius: '16px', padding: '28px 24px',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <TierBadge tier="advanced" />
            <div style={{ fontFamily: headingFont, fontSize: '22px', color: TEXT, fontWeight: 700, marginBottom: isHe ? '4px' : '20px' }}>
              {tierName('advanced')}
            </div>
            {isHe && (
              <div style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginBottom: '20px' }}>
                Advanced
              </div>
            )}
            <div style={{ marginBottom: isAnnual ? '8px' : '24px' }}>
              <span style={{ fontFamily: headingFont, fontSize: '38px', color: BIO_CYAN, fontWeight: 700 }}>
                ₪{isAnnual ? annualMonthly('advanced') : TIER_PRICING.advanced.monthly}
              </span>
              <span style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginRight: '6px' }}>{t('pricing.perMonth')}</span>
            </div>
            {isAnnual && (
              <div style={{ fontFamily: ASST, fontSize: '12px', color: MUTED, marginBottom: '16px' }}>
                {t('pricing.annualTotal', { annual: TIER_PRICING.advanced.annual, savings: annualSavings('advanced') })}
              </div>
            )}
            <div style={{ flex: 1, marginBottom: '24px' }}>
              {ADV_FEATURES.map((f, i) => <FeatureRow key={i} {...f} />)}
            </div>
            {upgradeBtn('advanced')}
          </div>

          {/* ── Professional ── */}
          <div
            className="pricing-card"
            style={{
              position: 'relative',
              background: NIGHT_CARD,
              border: currentTier === 'professional' && profile ? `2px solid ${BIO_CYAN}` : '1px solid rgba(0,229,195,0.1)',
              borderRadius: '16px', padding: '28px 24px',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <TierBadge tier="professional" />
            <div style={{ fontFamily: headingFont, fontSize: '22px', color: TEXT, fontWeight: 700, marginBottom: isHe ? '4px' : '20px' }}>
              {tierName('professional')}
            </div>
            {isHe && (
              <div style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginBottom: '20px' }}>
                Professional
              </div>
            )}
            <div style={{ marginBottom: isAnnual ? '8px' : '24px' }}>
              <span style={{ fontFamily: headingFont, fontSize: '38px', color: BIO_CYAN, fontWeight: 700 }}>
                ₪{isAnnual ? annualMonthly('professional') : TIER_PRICING.professional.monthly}
              </span>
              <span style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, marginRight: '6px' }}>{t('pricing.perMonth')}</span>
            </div>
            {isAnnual && (
              <div style={{ fontFamily: ASST, fontSize: '12px', color: MUTED, marginBottom: '16px' }}>
                {t('pricing.annualTotal', { annual: TIER_PRICING.professional.annual, savings: annualSavings('professional') })}
              </div>
            )}
            <div style={{ flex: 1, marginBottom: '24px' }}>
              {PRO_FEATURES.map((f, i) => <FeatureRow key={i} {...f} />)}
            </div>
            {upgradeBtn('professional')}
          </div>
        </div>

        {/* ── Payment provider note ── */}
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 20px 8px', textAlign: 'center' }}>
          <p style={{ fontFamily: ASST, fontSize: '12px', color: MUTED, margin: 0, lineHeight: 1.5 }}>
            {t('pricing.providerNote')}
          </p>
        </div>

        {/* ── Garden pack addon ── */}
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 20px 16px', animation: 'pricingFadeIn 0.5s ease 0.2s both' }}>
          <div style={{
            border: `1px dashed rgba(0,229,195,0.2)`,
            borderRadius: '14px', padding: '20px 24px',
            background: NIGHT_CARD,
            display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: headingFont, fontSize: '16px', color: BIO_CYAN, fontWeight: 700, marginBottom: '4px' }}>
                {t('pricing.gardenPackTitle')}
              </div>
              <div style={{ fontFamily: ASST, fontSize: '13px', color: TEXT_MID }}>
                {t('pricing.gardenPackDesc')}
              </div>
              <div style={{ fontFamily: ASST, fontSize: '12px', color: MUTED, marginTop: '4px' }}>
                {t('pricing.gardenPackExample', {
                  total: PRO_L.maxGardens! + 20,
                  base: TIER_PRICING.professional.monthly!,
                  sum: TIER_PRICING.professional.monthly! + 38,
                })}
              </div>
            </div>
            <button
              onClick={showToast}
              style={{
                fontFamily: isHe ? FRANK : ASST, fontSize: '13px', fontWeight: 700,
                color: NIGHT, background: BIO_CYAN,
                padding: '9px 20px', borderRadius: '100px',
                border: 'none', cursor: 'pointer', flexShrink: 0,
                transition: 'filter 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
            >
              {t('pricing.gardenPackBtn')}
            </button>
          </div>
        </div>

        {/* ── Shop link ── */}
        <div style={{ textAlign: 'center', padding: '8px 24px 32px', animation: 'pricingFadeIn 0.5s ease 0.25s both' }}>
          <Link
            to="/shop"
            style={{ fontFamily: ASST, fontSize: '13px', color: MUTED, textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = BIO_CYAN; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = MUTED; }}
          >
            {t('pricing.shopLink')}
          </Link>
        </div>

        {/* ── FAQ ── */}
        <div style={{
          maxWidth: '700px', margin: '0 auto',
          padding: '0 20px 80px',
          animation: 'pricingFadeIn 0.5s ease 0.3s both',
        }}>
          <h2 style={{
            fontFamily: headingFont, fontSize: '24px', color: BIO_CYAN,
            textAlign: 'center', marginBottom: '28px', fontWeight: 700,
          }}>
            {t('pricing.faqTitle')}
          </h2>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="faq-item">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', textAlign: isHe ? 'right' : 'left', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '16px 0',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ fontFamily: headingFont, fontSize: '16px', color: TEXT, fontWeight: 600, textAlign: isHe ? 'right' : 'left', flex: 1 }}>
                  {item.q}
                </span>
                <span style={{
                  color: BIO_CYAN, fontSize: '18px', flexShrink: 0,
                  transform: openFaq === i ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}>▾</span>
              </button>
              {openFaq === i && (
                <div className="faq-answer">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
