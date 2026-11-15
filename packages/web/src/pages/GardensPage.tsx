import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGardenSwitcherStore } from '../stores/gardenSwitcherStore';
import { usePlanLimit } from '../hooks/usePlanLimit';
import { useDirection } from '../hooks/useDirection';
import { useToastStore } from '../stores/toastStore';
import { CreateGardenModal } from '../components/garden/CreateGardenModal';
import { GardenLocationModal } from '../components/garden/GardenLocationModal';
import { GardenLimitNotice } from '../components/garden/GardenLimitNotice';
import { LocationNameEditor } from '../components/garden/LocationNameEditor';
import type { Garden } from '../stores/gardenStore';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { EN_HEADING } from '../styles/fonts';

const EARTH = '#050d0a';
const GOLD  = '#00e5c3';
const PARCH = '#b0cfbf';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';

const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

/** Tracker count per garden id. */
type TrackerCounts = Record<string, number>;

function activePlantCount(g: Garden): number {
  return (g.garden_plants ?? []).filter(p => !p.archived_at).length;
}

/**
 * All of the user's gardens in one list. Open to every logged-in user; the
 * plan's garden limit only gates creating more.
 */
export function GardensPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('garden');
  const { dir } = useDirection();
  const { session } = useAuthStore();
  const { gardens, activeGardenId, switchGarden, deleteGarden, setDefaultGarden, loadGardens } = useGardenSwitcherStore();
  const { limits, isAtGardenLimit } = usePlanLimit();
  const { show: showToast } = useToastStore();

  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Garden | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [trackerCounts, setTrackerCounts] = useState<TrackerCounts>({});
  const [locationGardenId, setLocationGardenId] = useState<string | null>(null);

  useEffect(() => { loadGardens(); }, []);

  // Tracker count per garden
  const gardenIdsKey = gardens.map(g => g.id).join(',');
  useEffect(() => {
    if (!session?.access_token || gardens.length === 0) return;
    const token = session.access_token;
    let cancelled = false;
    (async () => {
      const result: TrackerCounts = {};
      await Promise.all(gardens.map(async g => {
        const data = await api
          .get<{ trackers: unknown[] }>(`/api/trackers?gardenId=${g.id}`, token)
          .catch(() => ({ trackers: [] as unknown[] }));
        result[g.id] = data.trackers?.length ?? 0;
      }));
      if (!cancelled) setTrackerCounts(result);
    })();
    return () => { cancelled = true; };
  }, [gardenIdsKey, session?.access_token]);

  const atLimit = isAtGardenLimit(gardens.length);
  const canDelete = gardens.length > 1; // server refuses deleting the last garden

  async function handleDelete(garden: Garden) {
    setIsDeleting(true);
    try {
      await deleteGarden(garden.id);
      showToast(t('gardensPage.deleted', { name: garden.name }), 'success');
      setConfirmDelete(null);
    } catch (err: any) {
      const message =
        err?.errorCode === 'garden_not_empty'          ? t('gardensPage.deleteNotEmpty', { count: err.errorData?.plantCount ?? activePlantCount(garden) })
        : err?.errorCode === 'cannot_delete_last_garden' ? t('gardensPage.deleteLast')
        : t('gardensPage.deleteError');
      showToast(message, 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveName(gardenId: string) {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      await api.patch(`/api/garden/${gardenId}`, { name: editName.trim() }, token);
      await loadGardens();
      setEditingId(null);
      showToast(t('gardensPage.renamed'), 'success');
    } catch {
      showToast(t('gardensPage.renameError'), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetDefault(garden: Garden) {
    if (garden.is_default) return;
    try {
      await setDefaultGarden(garden.id);
      showToast(t('gardensPage.defaultSet', { name: garden.name }), 'success');
    } catch {
      showToast(t('gardensPage.defaultError'), 'error');
    }
  }

  const addButton = (
    <button
      type="button"
      onClick={() => setShowCreate(true)}
      style={{
        padding: '10px 20px',
        backgroundColor: GOLD, color: EARTH,
        border: 'none', borderRadius: '8px',
        fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
        cursor: 'pointer', transition: 'filter 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
    >
      {t('gardensPage.addGarden')}
    </button>
  );

  const secondaryBtn: React.CSSProperties = {
    padding: '7px 12px',
    background: 'transparent', color: `${PARCH}80`,
    border: '1px solid rgba(176,207,191,0.2)', borderRadius: '6px',
    fontFamily: EN_HEADING, fontSize: '12px', cursor: 'pointer',
  };

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none',
          backgroundImage: NOISE_BG, backgroundRepeat: 'repeat', opacity: 0.28,
        }}
      />

      <div dir={dir} style={{ backgroundColor: EARTH, minHeight: '100vh', position: 'relative', zIndex: 0 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '28px 16px 60px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontFamily: FRANK, fontSize: '2rem', color: GOLD, margin: 0, lineHeight: 1.1 }}>
                {t('gardensPage.title')}
              </h1>
              <p style={{ fontFamily: EN_HEADING, fontSize: '14px', color: `${PARCH}70`, margin: '4px 0 0' }}>
                {limits.maxGardens != null
                  ? t('gardensPage.countOfMax', { count: gardens.length, max: limits.maxGardens })
                  : t('gardensPage.count', { count: gardens.length })}
              </p>
            </div>

            {atLimit && limits.maxGardens != null
              ? <div style={{ maxWidth: '320px' }}><GardenLimitNotice max={limits.maxGardens} /></div>
              : addButton}
          </div>

          {/* Garden cards */}
          {gardens.length === 0 ? (
            <div style={{
              background: 'rgba(9,20,16,0.5)', border: '1px dashed rgba(0,229,195,0.2)',
              borderRadius: '12px', padding: '48px 24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌱</div>
              <p style={{ fontFamily: FRANK, fontSize: '18px', color: PARCH, margin: '0 0 16px' }}>
                {t('gardensPage.empty')}
              </p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                style={{
                  padding: '12px 24px', backgroundColor: GOLD, color: EARTH,
                  border: 'none', borderRadius: '8px',
                  fontFamily: FRANK, fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {t('gardensPage.createFirst')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' }}>
              {gardens.map(garden => {
                const isActive = garden.id === activeGardenId;
                const isEditing = editingId === garden.id;
                const plants = activePlantCount(garden);
                const trackers = trackerCounts[garden.id] ?? 0;

                return (
                  <div
                    key={garden.id}
                    style={{
                      background: 'rgba(9,20,16,0.6)',
                      border: `1px solid ${isActive ? 'rgba(0,229,195,0.4)' : 'rgba(0,229,195,0.15)'}`,
                      borderRadius: '12px', padding: '18px',
                      transition: 'border-color 0.2s',
                      minWidth: 0,
                    }}
                  >
                    {/* Title row: star · name · active badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleSetDefault(garden)}
                        aria-pressed={garden.is_default}
                        aria-label={garden.is_default ? t('gardensPage.defaultStar') : t('gardensPage.makeDefault')}
                        title={garden.is_default ? t('gardensPage.defaultStar') : t('gardensPage.makeDefault')}
                        style={{
                          flexShrink: 0, background: 'transparent', border: 'none', padding: '2px',
                          fontSize: '20px', lineHeight: 1,
                          color: garden.is_default ? GOLD : `${PARCH}55`,
                          cursor: garden.is_default ? 'default' : 'pointer',
                        }}
                      >
                        {garden.is_default ? '★' : '☆'}
                      </button>

                      {isEditing ? (
                        <form
                          onSubmit={e => { e.preventDefault(); void handleSaveName(garden.id); }}
                          style={{ display: 'flex', gap: '6px', flex: 1, minWidth: 0, flexWrap: 'wrap' }}
                        >
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Escape') setEditingId(null); }}
                            aria-label={t('gardensPage.nameLabel')}
                            placeholder={t('gardensPage.nameLabel')}
                            dir="auto"
                            autoFocus
                            style={{
                              flex: '1 1 140px', minWidth: 0, boxSizing: 'border-box',
                              backgroundColor: 'rgba(255,255,255,0.07)',
                              border: '1px solid rgba(0,229,195,0.4)',
                              borderRadius: '6px', padding: '6px 10px',
                              fontFamily: FRANK, fontSize: '16px', color: GOLD, outline: 'none',
                            }}
                          />
                          <button
                            type="submit"
                            disabled={isSaving || !editName.trim()}
                            style={{
                              padding: '6px 12px', backgroundColor: GOLD, color: EARTH,
                              border: 'none', borderRadius: '6px',
                              fontFamily: FRANK, fontSize: '13px', fontWeight: 700,
                              cursor: isSaving ? 'default' : 'pointer', opacity: isSaving ? 0.7 : 1,
                            }}
                          >
                            {isSaving ? t('gardensPage.saving') : t('gardensPage.save')}
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} style={secondaryBtn}>
                            {t('gardensPage.cancel')}
                          </button>
                        </form>
                      ) : (
                        <h3 dir="auto" style={{
                          fontFamily: FRANK, fontSize: '18px', color: isActive ? GOLD : PARCH, margin: 0,
                          flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          textAlign: 'start',
                        }}>
                          {garden.name}
                        </h3>
                      )}

                      {isActive && !isEditing && (
                        <span style={{
                          flexShrink: 0,
                          fontFamily: EN_HEADING, fontSize: '10px', fontWeight: 700,
                          padding: '2px 8px', borderRadius: '10px',
                          backgroundColor: 'rgba(0,229,195,0.15)',
                          color: GOLD, border: '1px solid rgba(0,229,195,0.3)',
                        }}>
                          {t('gardensPage.active')}
                        </span>
                      )}
                    </div>

                    {garden.description && (
                      <p dir="auto" style={{ fontFamily: EN_HEADING, fontSize: '12px', color: `${PARCH}55`, margin: '0 0 8px', textAlign: 'start' }}>
                        {garden.description}
                      </p>
                    )}

                    {/* Place name (drives weather, moon, calendar and Chupchu) */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                      margin: '8px 0 12px', padding: '8px 10px',
                      background: 'rgba(0,229,195,0.04)', border: '1px solid rgba(0,229,195,0.1)',
                      borderRadius: '8px',
                    }}>
                      <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                        <LocationNameEditor garden={garden} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setLocationGardenId(garden.id)}
                        style={{
                          padding: '5px 10px',
                          background: 'transparent', color: GOLD,
                          border: '1px solid rgba(0,229,195,0.3)', borderRadius: '6px',
                          fontFamily: EN_HEADING, fontSize: '12px', cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {garden.latitude != null ? t('locationPicker.change') : t('locationPicker.set')}
                      </button>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '14px' }}>
                      <span style={{ fontFamily: EN_HEADING, fontSize: '12px', color: `${PARCH}70` }}>
                        🌿 {t('gardensPage.plants', { count: plants })}
                      </span>
                      <span style={{ fontFamily: EN_HEADING, fontSize: '12px', color: `${PARCH}70` }}>
                        📊 {t('gardensPage.trackers', { count: trackers })}
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => navigate('/garden')}
                          style={{
                            padding: '7px 14px',
                            backgroundColor: 'rgba(0,229,195,0.12)', color: GOLD,
                            border: '1px solid rgba(0,229,195,0.3)', borderRadius: '6px',
                            fontFamily: FRANK, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          {t('gardensPage.open')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => { await switchGarden(garden.id); navigate('/garden'); }}
                          style={{
                            padding: '7px 14px',
                            backgroundColor: GOLD, color: EARTH,
                            border: 'none', borderRadius: '6px',
                            fontFamily: FRANK, fontSize: '13px', fontWeight: 700,
                            cursor: 'pointer', transition: 'filter 0.2s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                        >
                          {t('gardensPage.switchTo')}
                        </button>
                      )}
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => { setEditingId(garden.id); setEditName(garden.name); }}
                          style={secondaryBtn}
                        >
                          ✎ {t('gardensPage.rename')}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(garden)}
                          style={{
                            padding: '7px 10px',
                            background: 'rgba(220,80,80,0.08)', color: 'rgba(220,100,100,0.8)',
                            border: '1px solid rgba(220,80,80,0.2)', borderRadius: '6px',
                            fontFamily: EN_HEADING, fontSize: '12px', cursor: 'pointer',
                            marginInlineStart: 'auto',
                          }}
                        >
                          {t('gardensPage.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Garden location picker */}
      {locationGardenId && (
        <GardenLocationModal
          gardenId={locationGardenId}
          isOpen
          onClose={() => setLocationGardenId(null)}
        />
      )}

      {/* Create Garden Modal */}
      <CreateGardenModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-garden-title"
          style={{
            position: 'fixed', inset: 0, zIndex: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', padding: '16px',
          }}
          onClick={e => { if (e.target === e.currentTarget && !isDeleting) setConfirmDelete(null); }}
        >
          <div
            dir={dir}
            style={{
              backgroundColor: '#111f18', border: '1px solid rgba(220,80,80,0.3)',
              borderRadius: '14px', padding: '28px 24px',
              width: '100%', maxWidth: '380px',
              boxShadow: '0 20px 70px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
            <h3 id="delete-garden-title" style={{ fontFamily: FRANK, fontSize: '18px', color: '#E87070', margin: '0 0 12px', textAlign: 'center' }}>
              {t('gardensPage.deleteTitle')}
            </h3>
            <p style={{ fontFamily: EN_HEADING, fontSize: '14px', color: PARCH, textAlign: 'center', margin: '0 0 8px', lineHeight: 1.6 }}>
              {t('gardensPage.deleteConfirm', { name: confirmDelete.name })}
            </p>
            <p style={{ fontFamily: EN_HEADING, fontSize: '12px', color: `${PARCH}60`, textAlign: 'center', margin: '0 0 24px', lineHeight: 1.5 }}>
              {t('gardensPage.deleteWarning')}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={isDeleting}
                style={{
                  flex: 1, padding: '11px',
                  background: 'transparent', color: `${PARCH}80`,
                  border: '1px solid rgba(176,207,191,0.2)', borderRadius: '8px',
                  fontFamily: EN_HEADING, fontSize: '14px', cursor: 'pointer',
                }}
              >
                {t('gardensPage.cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                disabled={isDeleting}
                style={{
                  flex: 1, padding: '11px',
                  backgroundColor: isDeleting ? 'rgba(220,80,80,0.4)' : '#C0392B',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeleting ? t('gardensPage.deleting') : t('gardensPage.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
