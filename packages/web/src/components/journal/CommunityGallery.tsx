import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../api/client';
import { supabase } from '../../lib/supabase';

// ── Design tokens ─────────────────────────────────────────────────────────────
const NIGHT_CARD = '#111f18';
const NIGHT_LIFT = '#0e1e17';
const BIO_CYAN   = '#00e5c3';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

interface GalleryPhoto {
  id:           string;
  storage_path: string;
  caption:      string | null;
}

interface GalleryEntry {
  id:             string;
  action_type:    string;
  note:           string | null;
  entry_date:     string;
  journal_photos: GalleryPhoto[];
  users:          { display_name: string | null; avatar_url: string | null } | null;
}

// Keys are the English DB enum values
const ACTION_EMOJI: Record<string, string> = {
  planted:   '🌱',
  harvested: '🌿',
  treated:   '💧',
  observed:  '👁',
};

interface Props {
  isRTL: boolean;
  isHe:  boolean;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
  } catch {
    return iso;
  }
}

// ── Fix 1: hero photo with signed URL ────────────────────────────────────────
function GalleryPhotoHero({ photo }: { photo: GalleryPhoto }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.storage
      .from('journal-photos')
      .createSignedUrl(photo.storage_path, 3600)
      .then(({ data }) => { if (data?.signedUrl) setSignedUrl(data.signedUrl); })
      .catch(() => {});
  }, [photo.storage_path]);

  if (!signedUrl) {
    return (
      <div style={{
        width: '100%', aspectRatio: '4/3',
        background: 'rgba(0,229,195,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '40px',
      }}>
        🌿
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={photo.caption || 'תמונת גינה'}
      style={{
        width: '100%', aspectRatio: '4/3',
        objectFit: 'cover', display: 'block',
      }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CommunityGallery({ isRTL, isHe }: Props) {
  const { session } = useAuthStore();
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get<GalleryEntry[]>('/api/journal/gallery', session?.access_token)
      .then(data => setEntries(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <span style={{ fontSize: '36px', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}>🌿</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ fontFamily: DM_SANS, fontSize: '14px', color: '#ff5c8a' }}>{error}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌍</div>
        <p style={{ fontFamily: FRANK, fontSize: '18px', color: TEXT_MID, margin: '0 0 6px' }}>
          {isHe ? 'הגינה הציבורית ריקה עדיין' : 'The community garden is empty'}
        </p>
        <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: MUTED }}>
          {isHe ? 'עדיין אין פוסטים בגלריה. היה הראשון לשתף!' : 'Be the first to share!'}
        </p>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div style={{ columns: '2 280px', columnGap: '12px' }}>
        {entries.map(entry => {
          // Fix 2: safe display name + initials
          const displayName = entry.users?.display_name || null;
          const initials    = displayName ? displayName.slice(0, 2) : '?';
          const nameLabel   = displayName || (isHe ? 'גנן/ת' : 'Gardener');
          const heroPhoto   = entry.journal_photos[0] ?? null;

          return (
            <div
              key={entry.id}
              style={{
                breakInside: 'avoid',
                marginBottom: '12px',
                borderRadius: '14px',
                background: `linear-gradient(180deg, ${NIGHT_LIFT} 0%, ${NIGHT_CARD} 100%)`,
                border: '1px solid rgba(0,229,195,0.12)',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,195,0.28)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,195,0.12)'; }}
            >
              {/* Fix 1: hero photo with signed URL */}
              {heroPhoto && <GalleryPhotoHero photo={heroPhoto} />}

              {/* Meta */}
              <div style={{ padding: '10px 14px 12px' }}>
                {/* Author + date */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(0,229,195,0.3), rgba(170,255,0,0.2))',
                      border: '1px solid rgba(0,229,195,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: FRANK, fontSize: '11px', fontWeight: 700, color: BIO_CYAN,
                    }}>
                      {initials}
                    </div>
                    <span style={{ fontFamily: DM_SANS, fontSize: '12px', color: TEXT_MID }}>
                      {nameLabel}
                    </span>
                  </div>
                  <span style={{ fontFamily: DM_SANS, fontSize: '11px', color: MUTED }}>
                    {formatDate(entry.entry_date)}
                  </span>
                </div>

                {/* Action badge */}
                <span style={{
                  display: 'inline-block',
                  padding: '3px 9px', borderRadius: '20px',
                  background: 'rgba(0,229,195,0.1)', border: '1px solid rgba(0,229,195,0.2)',
                  fontFamily: DM_SANS, fontSize: '11px', fontWeight: 600,
                  color: BIO_CYAN, marginBottom: entry.note ? '6px' : 0,
                }}>
                  {ACTION_EMOJI[entry.action_type] ?? '📝'} {entry.action_type}
                </span>

                {entry.note && (
                  <p style={{
                    fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID,
                    lineHeight: 1.5, margin: 0,
                    display: '-webkit-box', WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {entry.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
