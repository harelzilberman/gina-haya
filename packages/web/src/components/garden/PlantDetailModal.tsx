import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlantSummary, PlantDetail } from '../../hooks/usePlants';
import { fetchPlantDetail } from '../../hooks/usePlants';
import { useAuthStore } from '../../stores/authStore';
import { useGardenStore } from '../../stores/gardenStore';
import { useToastStore } from '../../stores/toastStore';
import { PLANT_TABLE } from '../../data/plantTable';

interface Props {
  plant:   PlantSummary;
  onClose: () => void;
}

// ── Design tokens ────────────────────────────────────────────────────────────
const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const CATEGORY_EMOJIS: Record<string, string> = {
  vegetables:  '🥦',
  herbs:       '🌿',
  fruit_trees: '🍊',
  flowers:     '🌸',
  other:       '🌱',
};

const DAY_TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  fruit:  { bg: 'rgba(239,116,90,0.18)',  color: '#EF745A' },
  root:   { bg: 'rgba(181,136,99,0.18)',  color: '#B58863' },
  flower: { bg: 'rgba(196,132,200,0.18)', color: '#C884C8' },
  leaf:   { bg: 'rgba(0,229,195,0.12)',   color: BIO_CYAN  },
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
.plant-modal-card {
  animation: modal-scale-in 0.2s ease-out both;
}
.plant-modal-scroll::-webkit-scrollbar { width: 4px; }
.plant-modal-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
.plant-modal-scroll::-webkit-scrollbar-thumb { background: rgba(0,229,195,0.2); border-radius: 2px; }
`;

// ── Photo gallery ─────────────────────────────────────────────────────────────

function buildImagePaths(nameEn: string): (string | null)[] {
  const entry = PLANT_TABLE.find(p => p.nameEn.toLowerCase() === nameEn.toLowerCase());
  if (entry?.images) return entry.images;
  const key = nameEn.replace(/\s+/g, '_');
  return [1, 2, 3].map(n => `/images/plants/${key}_stage${n}_00001_.png`);
}

function PlantPhotoGallery({
  categoryEmoji,
  isHe,
  imagePaths,
}: {
  categoryEmoji: string;
  isHe: boolean;
  imagePaths: (string | null)[];
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [loaded,   setLoaded]   = useState<Record<number, boolean>>({});
  const [errored,  setErrored]  = useState<Record<number, boolean>>({});

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
              position:   'absolute',
              top:        '20px',
              right:      '20px',
              background: 'none',
              border:     'none',
              color:      '#fff',
              fontSize:   '28px',
              cursor:     'pointer',
              lineHeight: 1,
              padding:    '4px 8px',
              opacity:    0.8,
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
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '4px' }}
          />
        </div>
      )}

      {/* Label */}
      <p style={{ fontFamily: FRANK, fontSize: '12px', fontWeight: 400, color: `${TEXT_MID}50`, margin: '0 0 8px' }}>
        {isHe ? 'תמונות' : 'Photos'}
      </p>

      {/* 3-slot row — emoji always visible as base; image fades in on load, stays hidden on 404 or null */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[0, 1, 2].map(i => {
          const url       = imagePaths[i] ?? null;
          const isLoaded  = loaded[i];
          const isErrored = errored[i] || url === null;

          return (
            <div
              key={i}
              onClick={() => { if (isLoaded && !isErrored && url) setLightbox(url); }}
              style={{
                position:        'relative',
                width:           '32%',
                height:          '120px',
                borderRadius:    '8px',
                overflow:        'hidden',
                cursor:          isLoaded && !isErrored ? 'pointer' : 'default',
                flexShrink:      0,
                backgroundColor: 'rgba(9,20,16,0.8)',
              }}
            >
              {/* Emoji always as base layer */}
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
              {/* Image overlays emoji; fades in on load, unmounts on 404 or null */}
              {url && !errored[i] && (
                <img
                  src={url}
                  alt=""
                  onLoad={() =>  setLoaded(p  => ({ ...p, [i]: true }))}
                  onError={() => setErrored(p => ({ ...p, [i]: true }))}
                  style={{
                    position:   'absolute',
                    inset:      0,
                    width:      '100%',
                    height:     '100%',
                    objectFit:  'cover',
                    opacity:    isLoaded ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    display:    'block',
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
        color:        `${TEXT_MID}60`,
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
                fontFamily:      DM_SANS,
                fontSize:        '11px',
                fontWeight:      active ? 600 : 400,
                padding:         '3px 8px',
                borderRadius:    '6px',
                minWidth:        '34px',
                textAlign:       'center',
                backgroundColor: active ? 'rgba(0,229,195,0.12)' : 'rgba(255,255,255,0.04)',
                border:          active
                  ? '1px solid rgba(0,229,195,0.45)'
                  : '1px solid rgba(255,255,255,0.06)',
                color:           active ? BIO_CYAN : `${TEXT_MID}33`,
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
            position:        'relative',
            width:           '100%',
            maxWidth:        '560px',
            maxHeight:       '90vh',
            overflowY:       'auto',
            backgroundColor: NIGHT_CARD,
            border:          '1px solid rgba(0,229,195,0.2)',
            borderRadius:    '16px',
            padding:         '32px',
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
              backgroundColor: 'rgba(0,229,195,0.08)',
              border:          '1px solid rgba(0,229,195,0.25)',
              color:           BIO_CYAN,
              fontSize:        '18px',
              lineHeight:      1,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              cursor:          'pointer',
              transition:      'background-color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,229,195,0.16)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,229,195,0.08)'; }}
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
              backgroundColor: 'rgba(0,229,195,0.1)',
              border:          '1px solid rgba(0,229,195,0.25)',
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
              fontFamily: FRANK,
              fontWeight: 700,
              fontSize:   '28px',
              color:      BIO_CYAN,
              margin:     0,
              lineHeight: 1.1,
            }}>
              {plant.common_name_he}
            </h2>

            {/* English name */}
            {plant.common_name_en && (
              <p style={{
                fontFamily: DM_SANS,
                fontWeight: 400,
                fontSize:   '16px',
                color:      TEXT_MID,
                margin:     0,
              }}>
                {plant.common_name_en}
              </p>
            )}

            {/* Latin name */}
            {plant.latin_name && (
              <p style={{
                fontFamily: DM_SANS,
                fontStyle:  'italic',
                fontSize:   '14px',
                color:      `${TEXT_MID}50`,
                margin:     0,
              }}>
                {plant.latin_name}
              </p>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: 'rgba(0,229,195,0.1)', marginBottom: '20px' }} />

          {/* Photo gallery */}
          {plant.common_name_en && (
            <PlantPhotoGallery
              categoryEmoji={categoryEmoji}
              isHe={isHe}
              imagePaths={plant.common_name_en ? buildImagePaths(plant.common_name_en) : []}
            />
          )}

          {/* Description */}
          {description && (
            <p style={{
              fontFamily: DM_SANS,
              fontWeight: 300,
              fontSize:   '14px',
              lineHeight: 1.9,
              color:      `${TEXT_MID}CC`,
              margin:     '0 0 20px',
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
                color:        `${TEXT_MID}60`,
                margin:       '0 0 10px',
                letterSpacing:'0.05em',
              }}>
                {t('encyclopedia.dayTypeAffinity')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {plant.day_type_affinity.map(dt => {
                  const s = DAY_TYPE_STYLES[dt] ?? { bg: 'rgba(100,100,100,0.2)', color: `${TEXT_MID}99` };
                  return (
                    <span
                      key={dt}
                      style={{
                        fontFamily:      DM_SANS,
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
                  border:          '1px solid rgba(0,229,195,0.3)',
                  backgroundColor: 'transparent',
                  fontFamily:      FRANK,
                  fontWeight:      600,
                  fontSize:        '15px',
                  color:           MUTED,
                  cursor:          'pointer',
                  transition:      'background-color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,229,195,0.06)'; }}
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
                  backgroundColor: added ? 'rgba(0,229,195,0.4)' : BIO_CYAN,
                  fontFamily:      FRANK,
                  fontWeight:      600,
                  fontSize:        '15px',
                  color:           '#050d0a',
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
