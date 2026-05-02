import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../hooks/useDirection';
import { useAuthStore } from '../../stores/authStore';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { api } from '../../api/client';
import type { SoilType } from '@gina-haya/shared';

// ── Static data ────────────────────────────────────────────────────────────

const REGIONS = [
  'צפון', 'מרכז', 'ירושלים', 'דרום', 'שפלה', 'שרון', 'גליל', 'נגב', 'ערבה',
];

const SOIL_CARDS: { value: SoilType; emoji: string; he: string; en: string }[] = [
  { value: 'clay',   emoji: '🧱', he: 'חרסית',  en: 'Clay'   },
  { value: 'sandy',  emoji: '🏖️', he: 'חולית',  en: 'Sandy'  },
  { value: 'loam',   emoji: '🌿', he: 'לומית',  en: 'Loam'   },
  { value: 'chalky', emoji: '🪨', he: 'גירנית', en: 'Chalky' },
  { value: 'silty',  emoji: '💧', he: 'סחף',    en: 'Silty'  },
  { value: 'mixed',  emoji: '🌱', he: 'מעורב',  en: 'Mixed'  },
];

// ── Types ──────────────────────────────────────────────────────────────────

interface PlantOption {
  id: string;
  commonNameHe: string;
  commonNameEn: string;
}

// ── Progress dots ──────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex justify-center gap-2 mb-6">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full transition-colors"
          style={{ backgroundColor: i === step ? '#B7924A' : '#D1D5DB' }}
        />
      ))}
    </div>
  );
}

// ── ChupChu avatar ───────────────────────────────────────────────────────────

function ChupChuAvatar() {
  return (
    <div
      className="mx-auto flex items-center justify-center rounded-full mb-3"
      style={{ width: 80, height: 80, backgroundColor: '#B7924A' }}
    >
      <span className="text-4xl">🌕</span>
    </div>
  );
}

// ── Step 0: Intro + Privacy ────────────────────────────────────────────────

function Step0({ onAgree }: { onAgree: () => void }) {
  const { t } = useTranslation('auth');
  const { dir } = useDirection();
  const [agreed, setAgreed] = useState(false);

  return (
    <div dir={dir} className="text-center">
      <ChupChuAvatar />
      <p className="font-bold text-navy text-lg mb-1">{t('onboarding.welcome')}</p>
      <p className="text-gray-500 text-sm mb-5">{t('onboarding.opening')}</p>

      <div className="text-start mb-4">
        <p className="text-xs font-semibold text-navy mb-3 uppercase tracking-wide">
          {t('onboarding.privacyTitle')}
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(t('onboarding.privacyBullets', { returnObjects: true }) as string[]).map((b, i) => (
            <li key={i} className="text-sm text-gray-600">{b}</li>
          ))}
        </ul>
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline"
          style={{ color: '#4A7C59', display: 'block', marginBottom: '16px' }}
        >
          {t('onboarding.readFullPolicy')}
        </a>
        <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ marginTop: '2px', flexShrink: 0 }}
          />
          <span className="text-sm text-gray-600">{t('onboarding.privacyCheckbox')}</span>
        </label>
      </div>

      <button
        onClick={onAgree}
        disabled={!agreed}
        className="w-full rounded-lg py-3 text-sm font-medium text-white transition"
        style={{
          backgroundColor: agreed ? '#4A7C59' : '#9CA3AF',
          cursor: agreed ? 'pointer' : 'not-allowed',
        }}
      >
        {t('onboarding.agreeButton')}
      </button>
    </div>
  );
}

// ── Step 1: Location ───────────────────────────────────────────────────────

function Step1({
  value, onChange, onContinue, onSkip,
}: {
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation('auth');
  const { dir } = useDirection();

  return (
    <div dir={dir}>
      <h2 className="text-lg font-bold text-navy mb-5 text-center">
        {t('onboarding.step1Title')}
      </h2>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-sage/30 bg-white px-4 py-2.5 text-sm text-navy focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage mb-6"
      >
        <option value="">{t('onboarding.locationPlaceholder')}</option>
        {REGIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <NavButtons onContinue={onContinue} onSkip={onSkip} />
    </div>
  );
}

// ── Step 2: Soil Type ──────────────────────────────────────────────────────

function Step2({
  value, onChange, onContinue, onSkip,
}: {
  value: SoilType | null;
  onChange: (v: SoilType) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation('auth');
  const { dir, lang } = useDirection();

  return (
    <div dir={dir}>
      <h2 className="text-lg font-bold text-navy mb-5 text-center">
        {t('onboarding.step2Title')}
      </h2>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {SOIL_CARDS.map((card) => {
          const selected = value === card.value;
          return (
            <button
              key={card.value}
              onClick={() => onChange(card.value)}
              className="rounded-xl border-2 p-4 flex flex-col items-center gap-1 transition"
              style={{
                borderColor: selected ? '#4A7C59' : '#E5E7EB',
                backgroundColor: selected ? 'rgba(74,124,89,0.08)' : 'white',
              }}
            >
              <span className="text-2xl">{card.emoji}</span>
              <span className="text-xs font-medium text-navy">
                {lang === 'he' ? card.he : card.en}
              </span>
              <span className="text-xs text-gray-400">
                {lang === 'he' ? card.en : card.he}
              </span>
            </button>
          );
        })}
      </div>
      <NavButtons onContinue={onContinue} onSkip={onSkip} />
    </div>
  );
}

// ── Step 3: Plants ─────────────────────────────────────────────────────────

function Step3({
  selectedIds, onToggle, onFinish, onSkip, isSaving,
}: {
  selectedIds: string[];
  onToggle: (id: string, nameHe: string, nameEn: string) => void;
  onFinish: () => void;
  onSkip: () => void;
  isSaving: boolean;
}) {
  const { t } = useTranslation('auth');
  const { dir, lang } = useDirection();
  const { session } = useAuthStore();
  const [plants, setPlants] = useState<PlantOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = session?.access_token;
    const q = search.trim();
    setLoading(true);
    const params = new URLSearchParams({ lang, ...(q ? { q } : {}) });
    fetch(`/api/plants?${params}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      .then((r) => r.json())
      .then((data) => {
        setPlants(
          (data as { id: string; common_name_he: string; common_name_en: string }[]).map((p) => ({
            id: p.id,
            commonNameHe: p.common_name_he,
            commonNameEn: p.common_name_en,
          }))
        );
      })
      .catch(() => setPlants([]))
      .finally(() => setLoading(false));
  }, [search, lang, session]);

  return (
    <div dir={dir}>
      <h2 className="text-lg font-bold text-navy mb-4 text-center">
        {t('onboarding.step3Title')}
      </h2>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('onboarding.searchPlants')}
        className="w-full rounded-lg border border-sage/30 bg-white px-4 py-2.5 text-sm text-navy placeholder-gray-400 focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage mb-3"
      />

      <div className="overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-3 mb-4" style={{ maxHeight: 220 }}>
        {loading ? (
          <p className="text-center text-sm text-gray-400 py-4">{t('onboarding.loadingPlants')}</p>
        ) : plants.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-4">{t('onboarding.noPlantsFound')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {plants.map((p) => {
              const selected = selectedIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => onToggle(p.id, p.commonNameHe, p.commonNameEn)}
                  className="rounded-full px-3 py-1 text-sm font-medium transition"
                  style={{
                    backgroundColor: selected ? '#4A7C59' : 'white',
                    color: selected ? 'white' : '#1B2A4A',
                    border: selected ? '1.5px solid #4A7C59' : '1.5px solid #E5E7EB',
                  }}
                >
                  {lang === 'he' ? p.commonNameHe : p.commonNameEn}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={onFinish}
        disabled={isSaving}
        className="w-full rounded-lg py-3 text-sm font-medium text-white mb-3 transition"
        style={{ backgroundColor: '#4A7C59' }}
      >
        {isSaving ? t('onboarding.saving') : t('onboarding.finish')}
      </button>
      <button onClick={onSkip} className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
        {t('onboarding.skip')}
      </button>
    </div>
  );
}

// ── Shared nav buttons ─────────────────────────────────────────────────────

function NavButtons({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  const { t } = useTranslation('auth');
  return (
    <>
      <button
        onClick={onContinue}
        className="w-full rounded-lg py-3 text-sm font-medium text-white mb-3 transition hover:opacity-90"
        style={{ backgroundColor: '#4A7C59' }}
      >
        {t('onboarding.continue')}
      </button>
      <button
        onClick={onSkip}
        className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
      >
        {t('onboarding.skip')}
      </button>
    </>
  );
}

// ── Main wizard ────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const { session, markOnboardingComplete } = useAuthStore();
  const { step, gardenData, nextStep, updateGardenData, complete, setShowWelcomeScreen } = useOnboardingStore();
  const [isSaving, setIsSaving] = useState(false);
  const [gardenError, setGardenError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const lastSkipPlantsRef = useRef(false);

  const token = session?.access_token;

  const handleFinish = async (skipPlants = false) => {
    lastSkipPlantsRef.current = skipPlants;
    setIsSaving(true);
    setGardenError(null);
    try {
      const plantIds = skipPlants ? [] : gardenData.plantIds;
      await api.post(
        '/api/garden',
        {
          name: gardenData.name || 'הגינה שלי',
          locationRegion: gardenData.locationRegion,
          soilType: gardenData.soilType,
          plantIds,
        },
        token
      );
      await api.patch('/api/auth/profile', { onboardingComplete: true }, token);
      markOnboardingComplete();
      complete();
      if (!localStorage.getItem('chupchu-welcomed')) {
        setShowWelcomeScreen(true);
      }
    } catch (err) {
      console.error('[onboarding/finish]', err);
      setRetryCount((c) => c + 1);
      setGardenError('לא הצלחנו ליצור את הגינה שלך. נסה שוב.');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePlant = (id: string) => {
    const ids = gardenData.plantIds.includes(id)
      ? gardenData.plantIds.filter((x) => x !== id)
      : [...gardenData.plantIds, id];
    updateGardenData({ plantIds: ids });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(27,42,74,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <ProgressDots step={step} />

        {step === 0 && <Step0 onAgree={nextStep} />}

        {step === 1 && (
          <Step1
            value={gardenData.locationRegion}
            onChange={(v) => updateGardenData({ locationRegion: v })}
            onContinue={nextStep}
            onSkip={nextStep}
          />
        )}

        {step === 2 && (
          <Step2
            value={gardenData.soilType}
            onChange={(v) => updateGardenData({ soilType: v })}
            onContinue={nextStep}
            onSkip={nextStep}
          />
        )}

        {step === 3 && (
          <Step3
            selectedIds={gardenData.plantIds}
            onToggle={togglePlant}
            onFinish={() => handleFinish(false)}
            onSkip={() => handleFinish(true)}
            isSaving={isSaving}
          />
        )}

        {step === 3 && gardenError && (
          <div style={{
            marginTop: '12px',
            borderRadius: '8px',
            padding: '12px 14px',
            backgroundColor: 'rgba(192,57,43,0.08)',
            border: '1px solid rgba(192,57,43,0.25)',
            fontSize: '13px',
            color: '#C0392B',
            textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 8px' }}>{gardenError}</p>
            {retryCount >= 3 ? (
              <p style={{ margin: 0, fontSize: '12px' }}>
                אם הבעיה נמשכת,{' '}
                <a href="mailto:support@ginahaya.com" style={{ color: '#C0392B' }}>
                  צור קשר עם התמיכה
                </a>
              </p>
            ) : (
              <button
                onClick={() => handleFinish(lastSkipPlantsRef.current)}
                style={{
                  background: 'none', border: '1px solid rgba(192,57,43,0.4)',
                  borderRadius: '6px', padding: '5px 16px', fontSize: '13px',
                  color: '#C0392B', cursor: 'pointer',
                }}
              >
                נסה שוב
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
