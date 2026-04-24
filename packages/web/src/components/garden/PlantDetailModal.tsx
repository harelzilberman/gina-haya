import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlantSummary, PlantDetail } from '../../hooks/usePlants';
import { fetchPlantDetail } from '../../hooks/usePlants';
import { getPlantByName } from '../../data/plantTable';
import { useAuthStore } from '../../stores/authStore';
import { useGardenStore } from '../../stores/gardenStore';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  plant:   PlantSummary;
  onClose: () => void;
}

// ── Design tokens ────────────────────────────────────────────────────────────
const EARTH    = '#142B16';
const SOIL     = '#1C3A1E';
const GOLD     = '#F5C840';
const SAGE     = '#7DC084';
const PARCH    = '#EDE0C4';
const FRANK    = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST   = '"Assistant", "Heebo", sans-serif';
const PLAYFAIR = '"Playfair Display", Georgia, serif';

const CATEGORY_EMOJIS: Record<string, string> = {
  vegetables:  '🥦',
  herbs:       '🌿',
  fruit_trees: '🍊',
  flowers:     '🌸',
  other:       '🌱',
};

const DAY_TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  fruit:  { bg: 'rgba(245,200,64,0.18)',  color: GOLD },
  root:   { bg: 'rgba(155,122,72,0.28)',  color: '#D4B070' },
  flower: { bg: 'rgba(190,80,140,0.18)',  color: '#D88EC0' },
  leaf:   { bg: 'rgba(74,128,80,0.28)',   color: SAGE },
};
const DAY_TYPE_EMOJIS: Record<string, string> = {
  fruit: '🍅', root: '🥕', flower: '🌸', leaf: '🌿',
};

const HE_MONTHS = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const MODAL_CSS = `
@keyframes modal-scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes photo-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
.plant-modal-card {
  animation: modal-scale-in 0.2s ease-out both;
}
.plant-modal-scroll::-webkit-scrollbar { width: 4px; }
.plant-modal-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
.plant-modal-scroll::-webkit-scrollbar-thumb { background: rgba(125,192,132,0.2); border-radius: 2px; }
.plant-photo-shimmer {
  background: linear-gradient(90deg, rgba(20,43,22,0.7) 25%, rgba(40,75,42,0.85) 50%, rgba(20,43,22,0.7) 75%);
  background-size: 800px 100%;
  animation: photo-shimmer 1.5s ease-in-out infinite;
  border-radius: 8px;
}
`;

// ── Photo gallery ─────────────────────────────────────────────────────────────
function getPhotoUrls(plantNameEn: string) {
  const search = encodeURIComponent(plantNameEn.toLowerCase() + ' plant');
  return [
    `https://source.unsplash.com/400x300/?${search}&sig=1`,
    `https://source.unsplash.com/400x300/?${search}&sig=2`,
    `https://source.unsplash.com/400x300/?${search}&sig=3`,
  ];
}

function PlantPhotoGallery({
  nameEn,
  categoryEmoji,
  isHe,
  localImages,
}: {
  nameEn: string;
  categoryEmoji: string;
  isHe: boolean;
  localImages?: string[];
}) {
  const [lightbox, setLightbox]   = useState<string | null>(null);
  const [loaded,   setLoaded]     = useState<Record<number, boolean>>({});
  const [errored,  setErrored]    = useState<Record<number, boolean>>({});
  const fallbackUrls = localImages ? null : getPhotoUrls(nameEn);

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position:        'fixed',
            inset:           0,
            zIndex:          9999,
            backgroundColor: 'rgba(0,0,0,0.92)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            aria-label="Close"
            style={{
              position:        'absolute',
              top:             '20px',
              right:           '20px',
              background:      'none',
              border:          'none',
              color:           '#fff',
              fontSize:        '28px',
              cursor:          'pointer',
              lineHeight:      1,
              padding:         '4px 8px',
              opacity:         0.8,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
          >
            ✕
          </button>
          <img
            src={lightbox}
            onClick={e => e.stopPropagation()}
            alt=""
            style={{
              maxWidth:    '90vw',
              maxHeight:   '85vh',
              objectFit:   'contain',
              borderRadius:'4px',
            }}
          />
        </div>
      )}

      {/* Label */}
      <p style={{
        fontFamily: FRANK,
        fontSize:   '12px',
        fontWeight: 400,
        color:      `${PARCH}50`,
        margin:     '0 0 8px',
      }}>
        {isHe ? 'תמונות' : 'Photos'}
      </p>

      {/* Photos row — always 3 slots; local images fill slots, missing slots show emoji */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[0, 1, 2].map(i => {
          const localUrl    = localImages?.[i];
          const fallbackUrl = fallbackUrls?.[i];
          const url         = localUrl ?? fallbackUrl;
          const isPlaceholder = !url;

          return (
            <div
              key={i}
              onClick={() => { if (url && !errored[i]) setLightbox(url); }}
              style={{
                position:        'relative',
                width:           '32%',
                height:          '120px',
                borderRadius:    '8px',
                overflow:        'hidden',
                cursor:          url && !errored[i] ? 'pointer' : 'default',
                flexShrink:      0,
                backgroundColor: 'rgba(20,43,22,0.7)',
              }}
            >
              {/* Shimmer — only for remote fallback URLs while loading */}
              {fallbackUrl && !loaded[i] && !errored[i] && (
                <div className="plant-photo-shimmer" style={{ position: 'absolute', inset: 0 }} />
              )}
              {/* Placeholder — empty slot or errored image */}
              {(isPlaceholder || errored[i]) && (
                <div style={{
                  position:       'absolute',
                  inset:          0,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize:       '36px',
                }}>
                  {categoryEmoji}
                </div>
              )}
              {/* Photo */}
              {url && !errored[i] && (
                <img
                  src={url}
                  alt=""
                  onLoad={() =>  setLoaded(p  => ({ ...p, [i]: true }))}
                  onError={() => setErrored(p => ({ ...p, [i]: true }))}
                  style={{
                    width:     '100%',
                    height:    '100%',
                    objectFit: 'cover',
                    opacity:   localUrl ? 1 : (loaded[i] ? 1 : 0),
                    transition:'opacity 0.3s ease',
                    display:   'block',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Month strip ───────────────────────────────────────────────────────────────
function MonthStrip({
  activeMonths,
  label,
  isHe,
}: {
  activeMonths: number[];
  label: string;
  isHe: boolean;
}) {
  const activeSet  = new Set(activeMonths);
  const monthNames = isHe ? HE_MONTHS : EN_MONTHS;

  return (
    <div style={{ marginBottom: '16px' }}>
      <p style={{
        fontFamily:   FRANK,
        fontSize:     '12px',
        fontWeight:   400,
        color:        `${PARCH}60`,
        margin:       '0 0 10px',
        letterSpacing:'0.05em',
      }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        {ALL_MONTHS.map(m => {
          const active = activeSet.has(m);
          return (
            <span
              key={m}
              style={{
                fontFamily:      ASSIST,
                fontSize:        '11px',
                fontWeight:      active ? 600 : 400,
                padding:         '3px 8px',
                borderRadius:    '6px',
                minWidth:        '34px',
                textAlign:       'center',
                backgroundColor: active ? `${GOLD}22` : 'rgba(255,255,255,0.04)',
                border:          active
                  ? `1px solid ${GOLD}66`
                  : '1px solid rgba(255,255,255,0.06)',
                color:           active ? GOLD : `${PARCH}33`,
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

// ── Modal ─────────────────────────────────────────────────────────────────────
export function PlantDetailModal({ plant, onClose }: Props) {
  const { t, i18n } = useTranslation('garden');
  const isHe = i18n.language === 'he';

  const { user }                          = useAuthStore();
  const { activeGarden, loadGardens, addPlant } = useGardenStore();
  const { show: showToast }               = useToastStore();

  const [detail,  setDetail]  = useState<PlantDetail | null>(null);
  const [added,   setAdded]   = useState(false);
  const [adding,  setAdding]  = useState(false);

  useEffect(() => {
    fetchPlantDetail(plant.id).then(setDetail).catch(() => {});
  }, [plant.id]);

  useEffect(() => {
    if (user && !activeGarden) loadGardens();
  }, [user, activeGarden, loadGardens]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

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

  const description = isHe
    ? (detail?.description_he ?? plant.description_he)
    : (detail?.description_en ?? plant.description_en);

  const categoryEmoji = plant.emoji ?? CATEGORY_EMOJIS[plant.category ?? 'other'] ?? '🌱';
  const tableEntry = plant.common_name_en ? getPlantByName(plant.common_name_en) : undefined;

  return (
    <>
      <style>{MODAL_CSS}</style>

      {/* Backdrop */}
      <div
        onClick={handleBackdrop}
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          1000,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          padding:         '16px',
        }}
      >
        {/* Modal card */}
        <div
          className="plant-modal-card plant-modal-scroll"
          style={{
            position:     'relative',
            width:        '100%',
            maxWidth:     '560px',
            maxHeight:    '90vh',
            overflowY:    'auto',
            backgroundColor: SOIL,
            border:       `1px solid rgba(245,200,64,0.2)`,
            borderRadius: '16px',
            padding:      '32px',
          }}
        >
          {/* Close button — physically TOP-LEFT (in RTL: the far end) */}
          <button
            onClick={onClose}
            aria-label="סגור"
            style={{
              position:        'absolute',
              top:             '16px',
              left:            '16px',
              width:           '32px',
              height:          '32px',
              borderRadius:    '50%',
              backgroundColor: 'rgba(245,200,64,0.1)',
              border:          '1px solid rgba(245,200,64,0.25)',
              color:           GOLD,
              fontSize:        '18px',
              lineHeight:      1,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              cursor:          'pointer',
              transition:      'background-color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245,200,64,0.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(245,200,64,0.1)'; }}
          >
            ×
          </button>

          {/* Plant header */}
          <div style={{
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'flex-start',
            gap:           '6px',
            marginBottom:  '20px',
            paddingInlineStart: '4px',
          }}>
            {/* Emoji circle */}
            <div style={{
              width:           '64px',
              height:          '64px',
              borderRadius:    '50%',
              backgroundColor: 'rgba(74,128,80,0.3)',
              border:          '1px solid rgba(125,192,132,0.25)',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              fontSize:        '30px',
              lineHeight:      1,
              marginBottom:    '8px',
            }}>
              {categoryEmoji}
            </div>

            {/* Hebrew name */}
            <h2 style={{
              fontFamily:  FRANK,
              fontWeight:  700,
              fontSize:    '28px',
              color:       GOLD,
              margin:      0,
              lineHeight:  1.1,
            }}>
              {plant.common_name_he}
            </h2>

            {/* English name */}
            {plant.common_name_en && (
              <p style={{
                fontFamily: ASSIST,
                fontWeight: 400,
                fontSize:   '16px',
                color:      SAGE,
                margin:     0,
              }}>
                {plant.common_name_en}
              </p>
            )}

            {/* Latin name */}
            {plant.latin_name && (
              <p style={{
                fontFamily: PLAYFAIR,
                fontStyle:  'italic',
                fontSize:   '14px',
                color:      `${PARCH}50`,
                margin:     0,
              }}>
                {plant.latin_name}
              </p>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: 'rgba(125,192,132,0.1)', marginBottom: '20px' }} />

          {/* Photo gallery */}
          {plant.common_name_en && (
            <PlantPhotoGallery
              nameEn={plant.common_name_en}
              categoryEmoji={categoryEmoji}
              isHe={isHe}
              localImages={tableEntry?.images}
            />
          )}

          {/* Description */}
          {description && (
            <p style={{
              fontFamily:  ASSIST,
              fontWeight:  300,
              fontSize:    '14px',
              lineHeight:  1.9,
              color:       `${PARCH}CC`,
              margin:      '0 0 20px',
            }}>
              {description}
            </p>
          )}

          {/* Day type affinities */}
          {plant.day_type_affinity?.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{
                fontFamily:   FRANK,
                fontSize:     '12px',
                fontWeight:   400,
                color:        `${PARCH}60`,
                margin:       '0 0 10px',
                letterSpacing:'0.05em',
              }}>
                {t('encyclopedia.dayTypeAffinity')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {plant.day_type_affinity.map(dt => {
                  const s = DAY_TYPE_STYLES[dt] ?? { bg: 'rgba(100,100,100,0.2)', color: `${PARCH}99` };
                  return (
                    <span
                      key={dt}
                      style={{
                        fontFamily:      ASSIST,
                        fontSize:        '13px',
                        fontWeight:      500,
                        padding:         '5px 14px',
                        borderRadius:    '50px',
                        backgroundColor: s.bg,
                        color:           s.color,
                        border:          `1px solid ${s.color}33`,
                      }}
                    >
                      {DAY_TYPE_EMOJIS[dt]} {t(`encyclopedia.dayTypes.${dt}`, { defaultValue: dt })}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sowing / harvest months */}
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

          {/* Add to garden CTA */}
          <div style={{ marginTop: '24px' }}>
            {!user ? (
              <button
                onClick={() => { window.location.href = '/login'; }}
                style={{
                  width:           '100%',
                  padding:         '12px',
                  borderRadius:    '8px',
                  border:          `1px solid ${SAGE}55`,
                  backgroundColor: 'transparent',
                  fontFamily:      FRANK,
                  fontWeight:      600,
                  fontSize:        '15px',
                  color:           SAGE,
                  cursor:          'pointer',
                  transition:      'background-color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(125,192,132,0.08)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                {t('encyclopedia.loginToAdd')}
              </button>
            ) : activeGarden ? (
              <button
                onClick={handleAdd}
                disabled={added || adding}
                style={{
                  width:           '100%',
                  padding:         '13px',
                  borderRadius:    '8px',
                  border:          'none',
                  backgroundColor: added ? 'rgba(245,200,64,0.4)' : GOLD,
                  fontFamily:      FRANK,
                  fontWeight:      600,
                  fontSize:        '15px',
                  color:           EARTH,
                  cursor:          added || adding ? 'default' : 'pointer',
                  opacity:         adding ? 0.7 : 1,
                  transition:      'filter 0.2s, opacity 0.2s',
                }}
                onMouseEnter={e => {
                  if (!added && !adding) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)';
                }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
              >
                {added ? t('encyclopedia.addedToGarden') : t('encyclopedia.addToGarden')}
              </button>
            ) : null}
          </div>

        </div>
      </div>
    </>
  );
}
