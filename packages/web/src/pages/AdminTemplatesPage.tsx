import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';
import { GARDEN_TEMPLATES } from '../data/gardenTemplates';

const ADMIN_EMAIL = 'harelzilberman@gmail.com';
const GREEN = '#1D9E75';
const DANGER = '#E53E3E';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TemplateOverride {
  id: string;
  title_he: string | null;
  title_en: string | null;
  description_he: string | null;
  description_en: string | null;
  is_hidden: boolean;
  sort_order: number;
  icon: string | null;
  category_he: string | null;
  category_en: string | null;
  is_custom: boolean;
}

interface AdminRow {
  id: string;
  icon: string;
  titleHe: string;
  titleEn: string;
  descHe: string;
  descEn: string;
  isHidden: boolean;
  sortOrder: number;
  categoryHe: string;
  categoryEn: string;
  isCustom: boolean;
  hasOverride: boolean;
}

interface AddFormState {
  icon: string;
  titleHe: string;
  titleEn: string;
  descHe: string;
  descEn: string;
  categoryHe: string;
  categoryEn: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildRows(overrides: TemplateOverride[]): AdminRow[] {
  const ovMap = new Map(overrides.map(o => [o.id, o]));
  const baseIds = new Set(GARDEN_TEMPLATES.map(t => t.id));
  const rows: AdminRow[] = [];

  GARDEN_TEMPLATES.forEach((tpl, idx) => {
    const ov = ovMap.get(tpl.id);
    rows.push({
      id: tpl.id,
      icon: ov?.icon ?? tpl.icon,
      titleHe: ov?.title_he ?? tpl.title.he,
      titleEn: ov?.title_en ?? tpl.title.en,
      descHe: ov?.description_he ?? tpl.description.he,
      descEn: ov?.description_en ?? tpl.description.en,
      isHidden: ov?.is_hidden ?? false,
      sortOrder: ov?.sort_order ?? idx,
      categoryHe: tpl.category.he,
      categoryEn: tpl.category.en,
      isCustom: false,
      hasOverride: ovMap.has(tpl.id),
    });
  });

  // Custom templates not in gardenTemplates.ts
  overrides.forEach(ov => {
    if (!ov.is_custom || baseIds.has(ov.id)) return;
    rows.push({
      id: ov.id,
      icon: ov.icon ?? '🌿',
      titleHe: ov.title_he ?? '',
      titleEn: ov.title_en ?? '',
      descHe: ov.description_he ?? '',
      descEn: ov.description_en ?? '',
      isHidden: ov.is_hidden,
      sortOrder: ov.sort_order,
      categoryHe: ov.category_he ?? 'מותאם אישית',
      categoryEn: ov.category_en ?? 'Custom',
      isCustom: true,
      hasOverride: true,
    });
  });

  return rows.sort((a, b) => a.sortOrder - b.sortOrder);
}

function groupByCategory(rows: AdminRow[]): Array<{ he: string; en: string; rows: AdminRow[] }> {
  const map = new Map<string, { he: string; en: string; rows: AdminRow[] }>();
  for (const row of rows) {
    if (!map.has(row.categoryHe)) {
      map.set(row.categoryHe, { he: row.categoryHe, en: row.categoryEn, rows: [] });
    }
    map.get(row.categoryHe)!.rows.push(row);
  }
  return Array.from(map.values());
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdminTemplatesPage() {
  const { user, session, isAuthReady } = useAuthStore();
  const navigate = useNavigate();

  const [rows, setRows] = useState<AdminRow[]>([]);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>({
    icon: '🌿', titleHe: '', titleEn: '', descHe: '', descEn: '', categoryHe: '', categoryEn: '',
  });
  const [isAdding, setIsAdding] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag state (ref to avoid re-renders during drag)
  const draggedId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isAuthReady) return;
    if (user?.email !== ADMIN_EMAIL) navigate('/');
  }, [isAuthReady, user, navigate]);

  // Load overrides
  useEffect(() => {
    if (!isAuthReady || user?.email !== ADMIN_EMAIL) return;
    load();
  }, [isAuthReady, user]);

  async function load() {
    setIsLoading(true);
    try {
      const overrides = await api.get<TemplateOverride[]>('/api/templates');
      setRows(buildRows(overrides));
      setDirtyIds(new Set());
    } catch {
      // fall back to static data
      setRows(buildRows([]));
    } finally {
      setIsLoading(false);
    }
  }

  const token = session?.access_token;

  // ── Field editing ──────────────────────────────────────────────────────────

  function updateRow(id: string, changes: Partial<AdminRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));
    setDirtyIds(prev => new Set(prev).add(id));
  }

  // ── Save All ───────────────────────────────────────────────────────────────

  async function saveAll() {
    if (dirtyIds.size === 0 || !token) return;
    setIsSaving(true);
    try {
      const dirty = rows.filter(r => dirtyIds.has(r.id));
      const overrides = dirty.map(r => ({
        id: r.id,
        title_he: r.titleHe || null,
        title_en: r.titleEn || null,
        description_he: r.descHe || null,
        description_en: r.descEn || null,
        is_hidden: r.isHidden,
        sort_order: r.sortOrder,
        icon: r.icon || null,
        category_he: r.categoryHe || null,
        category_en: r.categoryEn || null,
        is_custom: r.isCustom,
      }));
      await api.put('/api/templates', { overrides }, token);
      setDirtyIds(new Set());
      setSaveMsg(`Saved ${overrides.length} template${overrides.length !== 1 ? 's' : ''}`);
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err: any) {
      setSaveMsg(`Error: ${err.message}`);
      setTimeout(() => setSaveMsg(null), 5000);
    } finally {
      setIsSaving(false);
    }
  }

  // ── Reset row ──────────────────────────────────────────────────────────────

  async function resetRow(id: string) {
    if (!token) return;
    try {
      await api.del(`/api/templates/${id}`, token);
      await load();
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    }
  }

  // ── Delete row ─────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteTarget || !token || deleteInput !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await api.del(`/api/templates/${deleteTarget.id}`, token);
      setDeleteTarget(null);
      setDeleteInput('');
      await load();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Add template ───────────────────────────────────────────────────────────

  async function submitAdd() {
    if (!addForm.titleHe.trim() || !addForm.titleEn.trim() || !token) return;
    setIsAdding(true);
    try {
      const newId = crypto.randomUUID();
      const existingOrders = rows.map(r => r.sortOrder);
      const maxOrder = existingOrders.length > 0 ? Math.max(...existingOrders) : 0;
      await api.put('/api/templates', {
        overrides: [{
          id: newId,
          title_he: addForm.titleHe,
          title_en: addForm.titleEn,
          description_he: addForm.descHe || null,
          description_en: addForm.descEn || null,
          is_hidden: false,
          sort_order: maxOrder + 1,
          icon: addForm.icon || '🌿',
          category_he: addForm.categoryHe || 'מותאם אישית',
          category_en: addForm.categoryEn || 'Custom',
          is_custom: true,
        }],
      }, token);
      setShowAddModal(false);
      setAddForm({ icon: '🌿', titleHe: '', titleEn: '', descHe: '', descEn: '', categoryHe: '', categoryEn: '' });
      await load();
    } catch (err: any) {
      alert(`Add failed: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  }

  // ── Drag & drop reorder ────────────────────────────────────────────────────

  function handleDragStart(id: string) {
    draggedId.current = id;
  }

  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (targetId !== draggedId.current) setDragOverId(targetId);
  }

  function handleDrop(targetId: string, categoryHe: string) {
    const fromId = draggedId.current;
    if (!fromId || fromId === targetId) { setDragOverId(null); return; }

    setRows(prev => {
      const catRows = prev.filter(r => r.categoryHe === categoryHe);
      const fromIdx = catRows.findIndex(r => r.id === fromId);
      const toIdx   = catRows.findIndex(r => r.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;

      const reordered = [...catRows];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);

      // Reassign sort_order for this category
      const newDirty = new Set(dirtyIds);
      const updated = reordered.map((r, i) => {
        const base = prev.find(p => p.id === r.id)!;
        const newOrder = base.sortOrder - (base.sortOrder % 100) + i; // keep category offset
        if (newOrder !== base.sortOrder) newDirty.add(r.id);
        return { ...r, sortOrder: newOrder };
      });

      setDirtyIds(newDirty);
      const otherRows = prev.filter(r => r.categoryHe !== categoryHe);
      return [...otherRows, ...updated].sort((a, b) => a.sortOrder - b.sortOrder);
    });

    setDragOverId(null);
    draggedId.current = null;
  }

  function handleDragEnd() {
    setDragOverId(null);
    draggedId.current = null;
  }

  // ── Render guards ──────────────────────────────────────────────────────────

  if (!isAuthReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7FAFC' }}>
        <span style={{ fontSize: 40 }}>🌱</span>
      </div>
    );
  }
  if (user?.email !== ADMIN_EMAIL) return null;

  const groups = groupByCategory(rows);
  const totalDirty = dirtyIds.size;

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .atp-row { transition: background 0.12s; }
        .atp-row:hover { background: #F0FFF4 !important; }
        .atp-input { border: 1px solid #E2E8F0; border-radius: 6px; padding: 5px 8px; font-size: 13px; font-family: inherit; outline: none; width: 100%; box-sizing: border-box; transition: border-color 0.15s; }
        .atp-input:focus { border-color: ${GREEN}; }
        .atp-textarea { border: 1px solid #E2E8F0; border-radius: 6px; padding: 5px 8px; font-size: 12px; font-family: inherit; outline: none; width: 100%; box-sizing: border-box; resize: vertical; min-height: 48px; transition: border-color 0.15s; }
        .atp-textarea:focus { border-color: ${GREEN}; }
        .atp-btn { border: none; border-radius: 6px; padding: 7px 16px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
        .atp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .atp-drag-over { outline: 2px dashed ${GREEN} !important; background: rgba(29,158,117,0.05) !important; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#F7FAFC', fontFamily: '"Inter", "Heebo", sans-serif' }}>

        {/* Header */}
        <div style={{
          background: 'white',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 64, flexShrink: 0, position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link to="/" style={{ color: '#718096', textDecoration: 'none', fontSize: 22, lineHeight: 1 }}>←</Link>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1A202C', lineHeight: 1.2 }}>
                ניהול תבניות גינה / Garden Templates Admin
              </div>
              <div style={{ fontSize: 12, color: '#A0AEC0', marginTop: 2 }}>{rows.length} templates</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {saveMsg && (
              <span style={{
                fontSize: 13,
                color: saveMsg.startsWith('Error') ? DANGER : GREEN,
                fontWeight: 500,
              }}>{saveMsg}</span>
            )}
            <span style={{ fontSize: 12, color: '#718096', background: '#EDF2F7', borderRadius: 4, padding: '3px 8px' }}>
              {ADMIN_EMAIL}
            </span>
            <button
              className="atp-btn"
              onClick={() => setShowAddModal(true)}
              style={{ background: '#EBF8F3', color: GREEN, border: `1px solid ${GREEN}33` }}
            >
              + הוסף / Add
            </button>
            <button
              className="atp-btn"
              onClick={saveAll}
              disabled={totalDirty === 0 || isSaving}
              style={{
                background: totalDirty > 0 ? GREEN : '#CBD5E0',
                color: 'white',
                minWidth: 100,
              }}
            >
              {isSaving ? 'Saving…' : `שמור הכל${totalDirty > 0 ? ` (${totalDirty})` : ''}`}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 80px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#A0AEC0', fontSize: 32 }}>🌱</div>
          ) : (
            groups.map(group => (
              <div key={group.he} style={{ marginBottom: 32 }}>
                {/* Category header */}
                <div style={{
                  fontSize: 13, fontWeight: 700, color: '#718096',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  padding: '0 0 8px',
                  borderBottom: '2px solid #E2E8F0',
                  marginBottom: 4,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span>{group.he}</span>
                  <span style={{ color: '#CBD5E0' }}>/</span>
                  <span style={{ color: '#A0AEC0' }}>{group.en}</span>
                  <span style={{ marginRight: 'auto', fontWeight: 400, color: '#CBD5E0' }}>({group.rows.length})</span>
                </div>

                {/* Rows */}
                {group.rows.map(row => {
                  const isDirty = dirtyIds.has(row.id);
                  const isDragOver = dragOverId === row.id;
                  return (
                    <div
                      key={row.id}
                      className={`atp-row${isDragOver ? ' atp-drag-over' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(row.id)}
                      onDragOver={e => handleDragOver(e, row.id)}
                      onDrop={() => handleDrop(row.id, group.he)}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: row.isHidden ? '#FFF5F5' : 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        padding: '12px 14px',
                        marginBottom: 6,
                        display: 'grid',
                        gridTemplateColumns: '28px 44px 1fr 1fr auto',
                        gap: 10,
                        alignItems: 'start',
                        opacity: row.isHidden ? 0.65 : 1,
                      }}
                    >
                      {/* Drag handle */}
                      <div style={{
                        cursor: 'grab', color: '#CBD5E0', fontSize: 18,
                        userSelect: 'none', paddingTop: 8, textAlign: 'center',
                      }}>⠿</div>

                      {/* Emoji */}
                      <div>
                        <input
                          className="atp-input"
                          value={row.icon}
                          onChange={e => updateRow(row.id, { icon: e.target.value })}
                          style={{ fontSize: 22, textAlign: 'center', padding: '4px 2px' }}
                          maxLength={4}
                        />
                        <div style={{ fontSize: 10, color: '#A0AEC0', textAlign: 'center', marginTop: 2 }}>
                          {row.isCustom ? 'custom' : 'base'}
                        </div>
                      </div>

                      {/* Titles + descriptions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input
                          className="atp-input"
                          placeholder="כותרת בעברית"
                          value={row.titleHe}
                          onChange={e => updateRow(row.id, { titleHe: e.target.value })}
                        />
                        <textarea
                          className="atp-textarea"
                          placeholder="תיאור בעברית"
                          value={row.descHe}
                          onChange={e => updateRow(row.id, { descHe: e.target.value })}
                          rows={2}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input
                          className="atp-input"
                          placeholder="Title in English"
                          value={row.titleEn}
                          onChange={e => updateRow(row.id, { titleEn: e.target.value })}
                        />
                        <textarea
                          className="atp-textarea"
                          placeholder="Description in English"
                          value={row.descEn}
                          onChange={e => updateRow(row.id, { descEn: e.target.value })}
                          rows={2}
                        />
                      </div>

                      {/* Controls */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, paddingTop: 2 }}>
                        {/* Unsaved dot */}
                        <div style={{ height: 10, display: 'flex', justifyContent: 'flex-end' }}>
                          {isDirty && (
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: '#F6AD55', boxShadow: '0 0 4px #F6AD5580',
                            }} title="Unsaved changes" />
                          )}
                        </div>

                        {/* Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: '#718096' }}>
                            {row.isHidden ? 'Hidden' : 'Visible'}
                          </span>
                          <div
                            onClick={() => updateRow(row.id, { isHidden: !row.isHidden })}
                            style={{
                              position: 'relative', width: 36, height: 20,
                              background: row.isHidden ? '#CBD5E0' : GREEN,
                              borderRadius: 10, cursor: 'pointer',
                              transition: 'background 0.2s',
                              flexShrink: 0,
                            }}
                          >
                            <div style={{
                              position: 'absolute', top: 2,
                              left: row.isHidden ? 2 : 18,
                              width: 16, height: 16,
                              background: 'white', borderRadius: '50%',
                              transition: 'left 0.2s',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                            }} />
                          </div>
                        </div>

                        {/* Reset + Delete */}
                        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                          {row.hasOverride && (
                            <button
                              onClick={() => resetRow(row.id)}
                              title="Reset to default"
                              style={{
                                background: 'none', border: '1px solid #E2E8F0',
                                borderRadius: 5, padding: '3px 8px',
                                fontSize: 11, color: '#718096', cursor: 'pointer',
                              }}
                            >
                              ↺
                            </button>
                          )}
                          <button
                            onClick={() => { setDeleteTarget({ id: row.id, title: row.titleEn || row.titleHe }); setDeleteInput(''); }}
                            title="Delete"
                            style={{
                              background: 'none', border: '1px solid #FED7D7',
                              borderRadius: 5, padding: '3px 8px',
                              fontSize: 12, color: DANGER, cursor: 'pointer',
                            }}
                          >
                            🗑
                          </button>
                        </div>

                        <div style={{ fontSize: 10, color: '#CBD5E0', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.id}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Add Template Modal ──────────────────────────────────────────────── */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            background: 'white', borderRadius: 12, padding: 28,
            width: '100%', maxWidth: 480,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A202C', margin: '0 0 20px' }}>
              הוסף תבנית / Add Template
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: '0 0 80px' }}>
                  <label style={{ fontSize: 11, color: '#718096', fontWeight: 600 }}>Icon</label>
                  <input className="atp-input" value={addForm.icon} maxLength={4}
                    onChange={e => setAddForm(f => ({ ...f, icon: e.target.value }))}
                    style={{ fontSize: 22, textAlign: 'center', marginTop: 4 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#718096', fontWeight: 600 }}>Category He / En</label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <input className="atp-input" placeholder="קטגוריה" value={addForm.categoryHe}
                      onChange={e => setAddForm(f => ({ ...f, categoryHe: e.target.value }))} />
                    <input className="atp-input" placeholder="Category" value={addForm.categoryEn}
                      onChange={e => setAddForm(f => ({ ...f, categoryEn: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#718096', fontWeight: 600 }}>Title (Hebrew)</label>
                <input className="atp-input" placeholder="כותרת בעברית" value={addForm.titleHe}
                  onChange={e => setAddForm(f => ({ ...f, titleHe: e.target.value }))}
                  style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#718096', fontWeight: 600 }}>Title (English)</label>
                <input className="atp-input" placeholder="Title in English" value={addForm.titleEn}
                  onChange={e => setAddForm(f => ({ ...f, titleEn: e.target.value }))}
                  style={{ marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#718096', fontWeight: 600 }}>Description (Hebrew)</label>
                <textarea className="atp-textarea" placeholder="תיאור בעברית" value={addForm.descHe}
                  onChange={e => setAddForm(f => ({ ...f, descHe: e.target.value }))}
                  style={{ marginTop: 4 }} rows={2} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#718096', fontWeight: 600 }}>Description (English)</label>
                <textarea className="atp-textarea" placeholder="Description in English" value={addForm.descEn}
                  onChange={e => setAddForm(f => ({ ...f, descEn: e.target.value }))}
                  style={{ marginTop: 4 }} rows={2} />
              </div>

              <p style={{ fontSize: 12, color: '#A0AEC0', margin: 0 }}>
                Elements start empty — build the layout on the map after adding.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="atp-btn"
                onClick={() => setShowAddModal(false)}
                style={{ background: '#EDF2F7', color: '#4A5568' }}>
                Cancel
              </button>
              <button className="atp-btn"
                onClick={submitAdd}
                disabled={!addForm.titleHe.trim() || !addForm.titleEn.trim() || isAdding}
                style={{ background: GREEN, color: 'white' }}>
                {isAdding ? 'Adding…' : 'Add Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ───────────────────────────────────────── */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            background: 'white', borderRadius: 12, padding: 28,
            width: '100%', maxWidth: 400,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A202C', margin: '0 0 6px' }}>
              האם למחוק את התבנית לצמיתות?
            </h3>
            <p style={{ fontSize: 14, color: '#718096', margin: '0 0 16px' }}>
              Delete "{deleteTarget.title}" permanently?
            </p>
            <p style={{ fontSize: 13, color: '#4A5568', margin: '0 0 8px' }}>
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              className="atp-input"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && deleteInput === 'DELETE' && confirmDelete()}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="atp-btn"
                onClick={() => { setDeleteTarget(null); setDeleteInput(''); }}
                style={{ background: '#EDF2F7', color: '#4A5568' }}>
                Cancel
              </button>
              <button className="atp-btn"
                onClick={confirmDelete}
                disabled={deleteInput !== 'DELETE' || isDeleting}
                style={{ background: DANGER, color: 'white' }}>
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
