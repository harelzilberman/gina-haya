import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlantSummary, PlantDetail } from '../../hooks/usePlants';
import { fetchPlantDetail } from '../../hooks/usePlants';
import { useAuthStore } from '../../stores/authStore';
import { useGardenStore } from '../../stores/gardenStore';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  plant: PlantSummary;
  onClose: () => void;
}

const DAY_TYPE_COLOURS: Record<string, string> = {
  fruit:  '#FED7AA',
  root:   '#FDE68A',
  flower: '#FBCFE8',
  leaf:   '#BBF7D0',
};

const DAY_TYPE_EMOJIS: Record<string, string> = {
  fruit: '🍅', root: '🥕', flower: '🌸', leaf: '🌿',
};

const HE_MONTHS = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function MonthStrip({ activeMonths, label, isHe }: { activeMonths: number[]; label: string; isHe: boolean }) {
  const activeSet = new Set(activeMonths);
  const monthNames = isHe ? HE_MONTHS : EN_MONTHS;

  return (
    <div className="mb-3">
      <p className="text-xs font-medium mb-1.5" style={{ color: '#6B7280' }}>{label}</p>
      <div className="flex gap-1 flex-wrap">
        {ALL_MONTHS.map(m => {
          const active = activeSet.has(m);
          return (
            <span
              key={m}
              className="text-xs px-1.5 py-0.5 rounded-md font-medium"
              style={{
                backgroundColor: active ? '#4A7C59' : '#F3F4F6',
                color:           active ? '#FFFFFF' : '#9CA3AF',
                minWidth: '32px',
                textAlign: 'center',
              }}
            >
              {monthNames[m - 1]}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function PlantDetailModal({ plant, onClose }: Props) {
  const { t, i18n } = useTranslation('garden');
  const isHe = i18n.language === 'he';
  const { user } = useAuthStore();
  const { activeGarden, loadGardens, addPlant } = useGardenStore();
  const { show: showToast } = useToastStore();

  const [detail, setDetail] = useState<PlantDetail | null>(null);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);

  // Fetch full plant detail
  useEffect(() => {
    fetchPlantDetail(plant.id).then(setDetail).catch(() => {});
  }, [plant.id]);

  // Ensure garden is loaded if user is logged in
  useEffect(() => {
    if (user && !activeGarden) {
      loadGardens();
    }
  }, [user, activeGarden, loadGardens]);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleAdd = async () => {
    if (!activeGarden || added || adding) return;
    setAdding(true);
    try {
      await addPlant(activeGarden.id, plant.id, plant.common_name_he, plant.common_name_en);
      setAdded(true);
      showToast(t('encyclopedia.addedToGarden'), 'success');
    } catch {
      showToast(t('saveError'), 'error');
    } finally {
      setAdding(false);
    }
  };

  const displayName = isHe ? plant.common_name_he : plant.common_name_en;
  const description  = isHe
    ? (detail?.description_he ?? plant.description_he)
    : (detail?.description_en ?? plant.description_en);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={handleBackdrop}
    >
      <div
        className="w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-2xl overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 bg-white flex items-start justify-between px-5 pt-5 pb-3"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold leading-tight" style={{ color: '#1B2A4A' }}>
              {plant.common_name_he}
            </h2>
            <p className="text-sm" style={{ color: '#4A7C59' }}>{plant.common_name_en}</p>
            {plant.latin_name && (
              <p className="text-xs italic mt-0.5" style={{ color: '#9CA3AF' }}>
                {plant.latin_name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg ms-3"
            style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
            aria-label="סגור"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Description */}
          {description && (
            <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
              {description}
            </p>
          )}

          {/* Day type affinities */}
          {plant.day_type_affinity?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: '#6B7280' }}>
                {t('encyclopedia.dayTypeAffinity')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {plant.day_type_affinity.map(dt => (
                  <span
                    key={dt}
                    className="text-sm px-3 py-1 rounded-full font-medium"
                    style={{ backgroundColor: DAY_TYPE_COLOURS[dt] ?? '#E5E7EB', color: '#1B2A4A' }}
                  >
                    {DAY_TYPE_EMOJIS[dt]} {t(`encyclopedia.dayTypes.${dt}`, { defaultValue: dt })}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sowing & harvest month strips */}
          {detail && (
            <>
              {detail.sowing_months_israel?.length > 0 && (
                <MonthStrip
                  activeMonths={detail.sowing_months_israel}
                  label={t('encyclopedia.sowingMonths')}
                  isHe={isHe}
                />
              )}
              {detail.harvest_months_israel?.length > 0 && (
                <MonthStrip
                  activeMonths={detail.harvest_months_israel}
                  label={t('encyclopedia.harvestMonths')}
                  isHe={isHe}
                />
              )}
            </>
          )}

          {/* Add to garden */}
          <div className="pt-2">
            {!user ? (
              <p className="text-sm text-center" style={{ color: '#9CA3AF' }}>
                {t('encyclopedia.loginToAdd')}
              </p>
            ) : activeGarden ? (
              <button
                onClick={handleAdd}
                disabled={added || adding}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity"
                style={{
                  backgroundColor: '#4A7C59',
                  opacity: (added || adding) ? 0.7 : 1,
                }}
              >
                {added ? t('encyclopedia.addedToGarden') : t('encyclopedia.addToGarden')}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
