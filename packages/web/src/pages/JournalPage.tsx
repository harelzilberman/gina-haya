import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';
import { JournalEntryForm } from '../components/journal/JournalEntryForm';
import { JournalEntryCard } from '../components/journal/JournalEntryCard';
import { CommunityGallery } from '../components/journal/CommunityGallery';
import type { JournalEntry } from '../components/journal/JournalEntryCard';

// ── Design tokens ─────────────────────────────────────────────────────────────
const NIGHT      = '#050d0a';
const NIGHT_CARD = '#111f18';
const NIGHT_LIFT = '#0e1e17';
const BIO_CYAN   = '#00e5c3';
const BIO_LIME   = '#aaff00';
const TEXT       = '#e8f5ee';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

type Tab = 'my' | 'community';

export function JournalPage() {
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';
  const { dir, isRTL } = useDirection();
  const { session } = useAuthStore();
  const token = session?.access_token;

  const [tab,        setTab]        = useState<Tab>('my');
  const [entries,    setEntries]    = useState<JournalEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [showForm,   setShowForm]   = useState(false);

  function loadEntries() {
    if (!token) return;
    setLoading(true);
    setError(null);
    api.get<JournalEntry[]>('/api/journal/entries', token)
      .then(data => setEntries(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (tab === 'my') loadEntries();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token]);

  async function handleDelete(id: string) {
    if (!token) return;
    try {
      await api.del(`/api/journal/entries/${id}`, token);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div dir={dir} style={{ backgroundColor: NIGHT, minHeight: '100vh' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '28px 16px 80px' }}>

        {/* Page header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{
            fontFamily: FRANK, fontSize: '28px', fontWeight: 700,
            color: TEXT, margin: '0 0 4px',
            background: `linear-gradient(135deg, ${BIO_CYAN}, ${BIO_LIME})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {isHe ? '📖 יומן הגינה' : '📖 Garden Journal'}
          </h1>
          <p style={{ fontFamily: DM_SANS, fontSize: '14px', color: MUTED, margin: 0 }}>
            {isHe
              ? "תעד/י פעולות, תמונות וצמחים. צ'ופצ'ו יזהה ויוסיף לגינה שלך."
              : "Document actions, photos and plants. ChupChu will identify and add them to your garden."}
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '24px',
          background: NIGHT_CARD, borderRadius: '12px', padding: '4px',
          border: '1px solid rgba(0,229,195,0.1)',
        }}>
          {([
            { id: 'my' as Tab,        label: isHe ? 'הרשומות שלי' : 'My Entries',       emoji: '🌿' },
            { id: 'community' as Tab, label: isHe ? 'גלריה קהילתית' : 'Community Gallery', emoji: '🌍' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '10px 16px',
                borderRadius: '9px', border: 'none',
                background: tab === t.id ? `linear-gradient(135deg, rgba(0,229,195,0.15), rgba(170,255,0,0.08))` : 'transparent',
                color: tab === t.id ? BIO_CYAN : MUTED,
                fontFamily: DM_SANS, fontSize: '14px', fontWeight: tab === t.id ? 700 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
                borderBottom: tab === t.id ? `2px solid ${BIO_CYAN}` : '2px solid transparent',
              }}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* ── My Entries Tab ─────────────────────────────────────────────── */}
        {tab === 'my' && (
          <>
            {/* New entry button / form */}
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: '14px', border: '1.5px dashed rgba(0,229,195,0.35)',
                  background: 'rgba(0,229,195,0.04)',
                  color: TEXT_MID, fontFamily: DM_SANS, fontSize: '15px',
                  cursor: 'pointer', marginBottom: '20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = BIO_CYAN; el.style.color = BIO_CYAN; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(0,229,195,0.35)'; el.style.color = TEXT_MID; }}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                </svg>
                {isHe ? 'רשומה חדשה ביומן' : 'New Journal Entry'}
              </button>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                <JournalEntryForm
                  isRTL={isRTL}
                  isHe={isHe}
                  onCreated={() => {
                    setShowForm(false);
                    loadEntries();
                  }}
                  onCancel={() => setShowForm(false)}
                />
              </div>
            )}

            {/* Entry list */}
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                <span style={{ fontSize: '36px', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}>🌱</span>
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontFamily: DM_SANS, fontSize: '14px', color: '#ff5c8a' }}>{error}</p>
                <button
                  onClick={loadEntries}
                  style={{
                    marginTop: '12px', padding: '8px 20px', borderRadius: '8px',
                    background: 'rgba(0,229,195,0.1)', border: '1px solid rgba(0,229,195,0.25)',
                    color: BIO_CYAN, fontFamily: DM_SANS, fontSize: '13px', cursor: 'pointer',
                  }}
                >
                  {isHe ? 'נסה שוב' : 'Retry'}
                </button>
              </div>
            ) : entries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: '52px', marginBottom: '14px' }}>📖</div>
                <p style={{ fontFamily: FRANK, fontSize: '20px', color: TEXT_MID, margin: '0 0 8px' }}>
                  {isHe ? 'היומן ריק עדיין' : 'Your journal is empty'}
                </p>
                <p style={{ fontFamily: DM_SANS, fontSize: '14px', color: MUTED }}>
                  {isHe ? 'הוסף/י את הרשומה הראשונה שלך' : 'Add your first journal entry'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {entries.map(entry => (
                  <JournalEntryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={handleDelete}
                    isRTL={isRTL}
                    isHe={isHe}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Community Gallery Tab ───────────────────────────────────────── */}
        {tab === 'community' && (
          <CommunityGallery isRTL={isRTL} isHe={isHe} />
        )}
      </div>
    </div>
  );
}
