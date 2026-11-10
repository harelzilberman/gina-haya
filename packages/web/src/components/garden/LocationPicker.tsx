import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GeoSearchResult } from '@gina-haya/shared';
import { useDirection } from '../../hooks/useDirection';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../api/client';
import { EN_HEADING } from '../../styles/fonts';

// ── Garden city picker ───────────────────────────────────────────────────────
//
// Search box backed by GET /api/geo/search (Open-Meteo geocoding) plus a
// "use my current location" button. Emits { latitude, longitude, timezone,
// locationName } — the shape PATCH/POST /api/garden accepts. The server
// rounds coordinates and resolves the timezone itself; the timezone we send
// is only its fallback.

export interface PickedLocation {
  latitude: number;
  longitude: number;
  /** Client-side fallback timezone (place tz from geocoding, else browser tz). */
  timezone: string | null;
  locationName: string;
}

type Variant = 'light' | 'dark';

const PALETTE: Record<Variant, {
  text: string; muted: string; accent: string; border: string; inputBg: string;
  listBg: string; hoverBg: string; error: string;
}> = {
  light: {
    text: '#1B2A4A', muted: '#6B7280', accent: '#4A9C68', border: 'rgba(74,156,104,0.3)',
    inputBg: '#FFFFFF', listBg: '#FFFFFF', hoverBg: 'rgba(74,156,104,0.08)', error: '#C0392B',
  },
  dark: {
    text: '#b0cfbf', muted: 'rgba(176,207,191,0.6)', accent: '#00e5c3', border: 'rgba(0,229,195,0.25)',
    inputBg: 'rgba(9,20,16,0.85)', listBg: '#111f18', hoverBg: 'rgba(0,229,195,0.08)', error: '#E87070',
  },
};

const SEARCH_DEBOUNCE_MS = 300;

function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function formatPlace(r: Pick<GeoSearchResult, 'name' | 'admin1' | 'country'>): string {
  // Skip admin1 when it just repeats the place name (e.g. "Berlin, Berlin, Germany").
  return [r.name, r.admin1 && r.admin1 !== r.name ? r.admin1 : null, r.country]
    .filter(Boolean)
    .join(', ');
}

interface Props {
  /** Currently selected location (controlled), shown as "Selected: …". */
  value?: PickedLocation | null;
  onSelect: (location: PickedLocation) => void;
  variant?: Variant;
  autoFocus?: boolean;
}

export function LocationPicker({ value, onSelect, variant = 'light', autoFocus = false }: Props) {
  const { t } = useTranslation('garden');
  const { dir, lang } = useDirection();
  const token = useAuthStore(s => s.session?.access_token);
  const c = PALETTE[variant];

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  // Debounced search. A sequence number drops responses that arrive out of order.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(false);
      return;
    }
    const seq = ++requestSeq.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, lang });
        const data = await api.get<GeoSearchResult[]>(`/api/geo/search?${params}`, token);
        if (seq !== requestSeq.current) return;
        setResults(data);
        setSearchError(false);
      } catch {
        if (seq !== requestSeq.current) return;
        setResults([]);
        setSearchError(true);
      } finally {
        if (seq === requestSeq.current) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, lang, token]);

  function pickResult(r: GeoSearchResult) {
    onSelect({
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone ?? browserTimeZone(),
      locationName: formatPlace(r),
    });
    setQuery('');
    setResults([]);
    setGeoError(null);
  }

  function handleUseMyLocation() {
    setGeoError(null);
    if (!('geolocation' in navigator)) {
      setGeoError(t('locationPicker.errors.unsupported'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false);
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lon = Math.round(pos.coords.longitude * 100) / 100;
        onSelect({
          latitude: lat,
          longitude: lon,
          timezone: browserTimeZone(),
          locationName: t('locationPicker.myLocationName', { lat: lat.toFixed(2), lon: lon.toFixed(2) }),
        });
      },
      err => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED)      setGeoError(t('locationPicker.errors.denied'));
        else if (err.code === err.TIMEOUT)           setGeoError(t('locationPicker.errors.timeout'));
        else                                         setGeoError(t('locationPicker.errors.unavailable'));
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60 * 1000 },
    );
  }

  const showList = query.trim().length >= 2;

  return (
    <div dir={dir} style={{ fontFamily: EN_HEADING, color: c.text }}>
      <label
        htmlFor="garden-location-search"
        style={{ display: 'block', fontSize: '13px', color: c.muted, marginBottom: '6px' }}
      >
        {t('locationPicker.searchLabel')}
      </label>
      <input
        id="garden-location-search"
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={t('locationPicker.searchPlaceholder')}
        autoFocus={autoFocus}
        autoComplete="off"
        dir="auto"
        style={{
          width: '100%', boxSizing: 'border-box',
          backgroundColor: c.inputBg, color: c.text,
          border: `1px solid ${c.border}`, borderRadius: '8px',
          padding: '10px 12px', fontSize: '14px', outline: 'none',
          fontFamily: EN_HEADING,
        }}
      />

      {showList && (
        <div
          role="listbox"
          aria-label={t('locationPicker.searchLabel')}
          style={{
            marginTop: '6px', maxHeight: '220px', overflowY: 'auto',
            backgroundColor: c.listBg, border: `1px solid ${c.border}`, borderRadius: '8px',
          }}
        >
          {searching && results.length === 0 ? (
            <p style={{ margin: 0, padding: '10px 12px', fontSize: '13px', color: c.muted }}>
              {t('locationPicker.searching')}
            </p>
          ) : searchError ? (
            <p style={{ margin: 0, padding: '10px 12px', fontSize: '13px', color: c.error }}>
              {t('locationPicker.searchError')}
            </p>
          ) : results.length === 0 ? (
            <p style={{ margin: 0, padding: '10px 12px', fontSize: '13px', color: c.muted }}>
              {t('locationPicker.noResults')}
            </p>
          ) : (
            results.map(r => (
              <button
                key={`${r.latitude},${r.longitude},${r.name}`}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => pickResult(r)}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = c.hoverBg; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                style={{
                  display: 'block', width: '100%', textAlign: 'start',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '9px 12px', fontSize: '14px', color: c.text,
                  fontFamily: EN_HEADING,
                }}
              >
                📍 {formatPlace(r)}
              </button>
            ))
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '12px 0' }}>
        <span style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        <span style={{ fontSize: '12px', color: c.muted }}>{t('locationPicker.or')}</span>
        <span style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      </div>

      <button
        type="button"
        onClick={handleUseMyLocation}
        disabled={locating}
        style={{
          width: '100%', padding: '10px 12px',
          background: 'transparent', color: c.accent,
          border: `1px solid ${c.border}`, borderRadius: '8px',
          fontSize: '14px', fontWeight: 600, fontFamily: EN_HEADING,
          cursor: locating ? 'default' : 'pointer', opacity: locating ? 0.7 : 1,
        }}
      >
        {locating ? t('locationPicker.locating') : `📍 ${t('locationPicker.useMyLocation')}`}
      </button>

      {geoError && (
        <p role="alert" style={{ margin: '8px 0 0', fontSize: '12px', color: c.error, lineHeight: 1.5 }}>
          {geoError}
        </p>
      )}

      {value && (
        <p style={{ margin: '12px 0 0', fontSize: '14px', fontWeight: 600, color: c.accent }}>
          ✓ {t('locationPicker.selected', { name: value.locationName })}
        </p>
      )}

      <p style={{ margin: '8px 0 0', fontSize: '11px', color: c.muted, lineHeight: 1.5 }}>
        {t('locationPicker.privacyNote')}
      </p>
    </div>
  );
}
