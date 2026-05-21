import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGardenSwitcherStore } from '../stores/gardenSwitcherStore';
import { usePlanLimit } from '../hooks/usePlanLimit';
import { useToastStore } from '../stores/toastStore';
import { CreateGardenModal } from '../components/garden/CreateGardenModal';
import type { Garden } from '../stores/gardenStore';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';

const EARTH = '#050d0a';
const GOLD  = '#00e5c3';
const PARCH = '#b0cfbf';
const SAGE  = '#4A9C68';
const FRANK = '"Frank Ruhl Libre", Georgia, serif';
const ASST  = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const NOISE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`;

interface GardenStats {
  [gardenId: string]: { plants: number; trackers: number };
}

interface ConfirmDelete {
  garden: Garden;
}

export function GardensPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation('common');
  const isHe = i18n.language === 'he';
  const { session } = useAuthStore();
  const { gardens, activeGardenId, switchGarden, deleteGarden, setDefaultGarden, loadGardens } = useGardenSwitcherStore();
  const { tier, limits } = usePlanLimit();
  const { show: showToast } = useToastStore();

  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDelete | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<GardenStats>({});

  // Redirect non-pro users
  useEffect(() => {
    if (tier && tier !== 'gardener_pro' && tier !== 'professional') {
      showToast('גינות מרובות זמינות בתכנית המקצועית', 'info');
      navigate('/map');
    }
  }, [tier]);

  useEffect(() => { loadGardens(); }, []);

  // Fetch stats for each garden
  useEffect(() => {
    if (!session?.access_token || gardens.length === 0) return;
    const token = session.access_token;
    const fetchStats = async () => {
      const result: GardenStats = {};
      await Promise.all(gardens.map(async g => {
        try {
          const trackersData = await api.get<{ trackers: any[] }>(`/api/trackers?gardenId=${g.id}`, token).catch(() => ({ trackers: [] }));
          result[g.id] = {
            plants: g.garden_plants?.length ?? 0,
            trackers: (trackersData as any).trackers?.length ?? 0,
          };
        } catch {
          result[g.id] = { plants: g.garden_plants?.length ?? 0, trackers: 0 };
        }
      }));
      setStats(result);
    };
    fetchStats();
  }, [gardens.length, session?.access_token]);

  const atLimit = limits.maxGardens !== null && gardens.length >= limits.maxGardens;

  async function handleDelete(garden: Garden) {
    setIsDeleting(true);
    try {
      await deleteGarden(garden.id);
      showToast(`הגינה '${garden.name}' נמחקה`, 'success');
      setConfirmDelete(null);
    } catch (err: any) {
      showToast(err.message || 'לא ניתן למחוק. נסה שוב.', 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveEdit(gardenId: string) {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      await api.patch(`/api/garden/${gardenId}`, { name: editName.trim(), location: editLocation.trim() || undefined }, token);
      await loadGardens();
      setEditingId(null);
      showToast('הגינה עודכנה', 'success');
    } catch {
      showToast('לא ניתן לשמור. נסה שוב.', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetDefault(gardenId: string) {
    try {
      await setDefaultGarden(gardenId);
      showToast('הגינה הוגדרה כגינה ראשית', 'success');
    } catch {
      showToast('שגיאה בעדכון הגינה הראשית', 'error');
    }
  }

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none',
          backgroundImage: NOISE_BG, backgroundRepeat: 'repeat', opacity: 0.28,
        }}
      />

      <div dir="rtl" style={{ backgroundColor: EARTH, minHeight: '100vh', position: 'relative', zIndex: 0 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '28px 16px 60px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontFamily: FRANK, fontSize: '2rem', color: GOLD, margin: 0, lineHeight: 1.1 }}>
                הגינות שלי
              </h1>
              <p style={{ fontFamily: ASST, fontSize: '14px', color: `${PARCH}70`, margin: '4px 0 0' }}>
                {gardens.length}{limits.maxGardens ? `/${limits.maxGardens}` : ''} גינות
              </p>
            </div>

            {!atLimit ? (
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: GOLD, color: EARTH,
                  border: 'none', borderRadius: '8px',
                  fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', transition: 'filter 0.2s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
              >
                + הוסף גינה
              </button>
            ) : (
              <button
                onClick={() => navigate('/shop')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent', color: GOLD,
                  border: `1px solid rgba(0,229,195,0.4)`, borderRadius: '8px',
                  fontFamily: ASST, fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                הוסף חבילת גינות →
              </button>
            )}
          </div>

          {/* Garden cards */}
          {gardens.length === 0 ? (
            <div style={{
              background: 'rgba(9,20,16,0.5)', border: '1px dashed rgba(0,229,195,0.2)',
              borderRadius: '12px', padding: '48px 24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌱</div>
              <p style={{ fontFamily: FRANK, fontSize: '18px', color: PARCH, margin: '0 0 16px' }}>
                אין גינות עדיין
              </p>
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  padding: '12px 24px', backgroundColor: GOLD, color: EARTH,
                  border: 'none', borderRadius: '8px',
                  fontFamily: FRANK, fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                צור גינה ראשונה
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
              {gardens.map(garden => {
                const isActive = garden.id === activeGardenId;
                const isEditing = editingId === garden.id;
                const gardenStats = stats[garden.id];

                return (
                  <div
                    key={garden.id}
                    style={{
                      background: 'rgba(9,20,16,0.6)',
                      border: `1px solid ${isActive ? `rgba(0,229,195,0.4)` : 'rgba(0,229,195,0.15)'}`,
                      borderRadius: '12px', padding: '20px',
                      transition: 'border-color 0.2s',
                      position: 'relative',
                    }}
                  >
                    {/* Active badge */}
                    {isActive && (
                      <div style={{
                        position: 'absolute', top: '12px', insetInlineEnd: '12px',
                        fontFamily: ASST, fontSize: '10px', fontWeight: 700,
                        padding: '2px 8px', borderRadius: '10px',
                        backgroundColor: 'rgba(0,229,195,0.15)',
                        color: GOLD, border: '1px solid rgba(0,229,195,0.3)',
                        letterSpacing: '0.04em',
                      }}>
                        גינה פעילה
                      </div>
                    )}

                    {isEditing ? (
                      /* Edit mode */
                      <div>
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            backgroundColor: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(0,229,195,0.4)',
                            borderRadius: '6px', padding: '8px 12px',
                            fontFamily: FRANK, fontSize: '16px', color: GOLD,
                            outline: 'none', direction: 'rtl', marginBottom: '8px',
                          }}
                          placeholder="שם הגינה"
                        />
                        <input
                          type="text"
                          value={editLocation}
                          onChange={e => setEditLocation(e.target.value)}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(0,229,195,0.2)',
                            borderRadius: '6px', padding: '7px 12px',
                            fontFamily: ASST, fontSize: '13px', color: PARCH,
                            outline: 'none', direction: 'rtl', marginBottom: '12px',
                          }}
                          placeholder="מיקום"
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{
                              flex: 1, padding: '8px',
                              background: 'transparent', color: `${PARCH}70`,
                              border: '1px solid rgba(176,207,191,0.2)', borderRadius: '6px',
                              fontFamily: ASST, fontSize: '13px', cursor: 'pointer',
                            }}
                          >
                            ביטול
                          </button>
                          <button
                            onClick={() => handleSaveEdit(garden.id)}
                            disabled={isSaving}
                            style={{
                              flex: 2, padding: '8px',
                              backgroundColor: GOLD, color: EARTH,
                              border: 'none', borderRadius: '6px',
                              fontFamily: FRANK, fontSize: '13px', fontWeight: 700,
                              cursor: isSaving ? 'default' : 'pointer', opacity: isSaving ? 0.7 : 1,
                            }}
                          >
                            {isSaving ? 'שומר...' : 'שמור'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <>
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '20px' }}>🏡</span>
                            <h3 style={{ fontFamily: FRANK, fontSize: '18px', color: isActive ? GOLD : PARCH, margin: 0 }}>
                              {garden.name}
                              {garden.is_default && (
                                <span style={{ fontFamily: ASST, fontSize: '11px', color: `${PARCH}50`, marginRight: '8px', fontWeight: 400 }}>ראשית</span>
                              )}
                            </h3>
                          </div>
                          {garden.location && (
                            <p style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}60`, margin: '0 0 2px', paddingInlineStart: '28px' }}>
                              📍 {garden.location}
                            </p>
                          )}
                          {garden.description && (
                            <p style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}55`, margin: '0', paddingInlineStart: '28px' }}>
                              {garden.description}
                            </p>
                          )}
                        </div>

                        {/* Stats */}
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                          <span style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}70` }}>
                            🌿 {gardenStats?.plants ?? garden.garden_plants?.length ?? 0} צמחים
                          </span>
                          <span style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}70` }}>
                            📊 {gardenStats?.trackers ?? 0} מעקבים
                          </span>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {!isActive && (
                            <button
                              onClick={() => { switchGarden(garden.id); navigate('/map'); }}
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
                              עבור לגינה
                            </button>
                          )}
                          {isActive && (
                            <button
                              onClick={() => navigate('/map')}
                              style={{
                                padding: '7px 14px',
                                backgroundColor: 'rgba(0,229,195,0.12)', color: GOLD,
                                border: `1px solid rgba(0,229,195,0.3)`, borderRadius: '6px',
                                fontFamily: FRANK, fontSize: '13px', fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              פתח מפה
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingId(garden.id);
                              setEditName(garden.name);
                              setEditLocation(garden.location || '');
                            }}
                            style={{
                              padding: '7px 12px',
                              background: 'transparent', color: `${PARCH}80`,
                              border: '1px solid rgba(176,207,191,0.2)', borderRadius: '6px',
                              fontFamily: ASST, fontSize: '12px', cursor: 'pointer',
                            }}
                          >
                            ערוך
                          </button>
                          {!garden.is_default && (
                            <button
                              onClick={() => handleSetDefault(garden.id)}
                              title="הגדר כגינה ראשית"
                              style={{
                                padding: '7px 10px',
                                background: 'transparent', color: `${PARCH}60`,
                                border: '1px solid rgba(176,207,191,0.15)', borderRadius: '6px',
                                fontFamily: ASST, fontSize: '12px', cursor: 'pointer',
                              }}
                            >
                              ★ ראשית
                            </button>
                          )}
                          {!garden.is_default && (
                            <button
                              onClick={() => setConfirmDelete({ garden })}
                              style={{
                                padding: '7px 10px',
                                background: 'rgba(220,80,80,0.08)', color: 'rgba(220,100,100,0.8)',
                                border: '1px solid rgba(220,80,80,0.2)', borderRadius: '6px',
                                fontFamily: ASST, fontSize: '12px', cursor: 'pointer',
                                marginInlineStart: 'auto',
                              }}
                            >
                              מחק
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Garden Modal */}
      <CreateGardenModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', padding: '16px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null); }}
        >
          <div
            dir="rtl"
            style={{
              backgroundColor: '#111f18', border: '1px solid rgba(220,80,80,0.3)',
              borderRadius: '14px', padding: '28px 24px',
              width: '100%', maxWidth: '380px',
              boxShadow: '0 20px 70px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ fontFamily: FRANK, fontSize: '18px', color: '#E87070', margin: '0 0 12px', textAlign: 'center' }}>
              מחיקת גינה
            </h3>
            <p style={{ fontFamily: ASST, fontSize: '14px', color: PARCH, textAlign: 'center', margin: '0 0 8px', lineHeight: 1.6 }}>
              האם למחוק את <strong>'{confirmDelete.garden.name}'</strong>?
            </p>
            <p style={{ fontFamily: ASST, fontSize: '12px', color: `${PARCH}60`, textAlign: 'center', margin: '0 0 24px', lineHeight: 1.5 }}>
              כל הצמחים, המעקבים והמשימות של גינה זו יימחקו לצמיתות.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  flex: 1, padding: '11px',
                  background: 'transparent', color: `${PARCH}80`,
                  border: '1px solid rgba(176,207,191,0.2)', borderRadius: '8px',
                  fontFamily: ASST, fontSize: '14px', cursor: 'pointer',
                }}
              >
                ביטול
              </button>
              <button
                onClick={() => handleDelete(confirmDelete.garden)}
                disabled={isDeleting}
                style={{
                  flex: 1, padding: '11px',
                  backgroundColor: isDeleting ? 'rgba(220,80,80,0.4)' : '#C0392B',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontFamily: FRANK, fontSize: '14px', fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeleting ? 'מוחק...' : 'מחק'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
