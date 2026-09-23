import { createClient } from '@supabase/supabase-js';

const supabaseUrl    = import.meta.env.VITE_SUPABASE_URL    as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

// ── Snapshot auth URL params at module load ───────────────────────────────────
//
// Module-level code runs synchronously during the initial script execution —
// before createRoot schedules the first render as a macrotask and before the
// Supabase GoTrueClient._initialize() Promise (microtask) can read and clear
// the URL hash. This is therefore the only reliable place to capture implicit
// recovery params (#access_token=…) and error params (#error=access_denied…).
//
// On the /reset-password route we also disable detectSessionInUrl on the
// singleton so it never races the page by consuming the URL itself.

export interface SupabaseAuthParams {
  access_token:      string | null;
  refresh_token:     string | null;
  token_hash:        string | null;
  type:              string | null;
  code:              string | null;
  error:             string | null;
  error_code:        string | null;
  error_description: string | null;
}

function snapshotAuthParams(): Readonly<SupabaseAuthParams> | null {
  if (typeof window === 'undefined') return null;

  const search = new URLSearchParams(window.location.search);
  const hash   = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const get    = (k: string): string | null => search.get(k) ?? hash.get(k);

  const p: SupabaseAuthParams = {
    access_token:      get('access_token'),
    refresh_token:     get('refresh_token'),
    token_hash:        get('token_hash'),
    type:              get('type'),
    code:              get('code'),
    error:             get('error'),
    error_code:        get('error_code'),
    error_description: get('error_description'),
  };

  return Object.values(p).some(Boolean) ? Object.freeze(p) : null;
}

/** Frozen snapshot of auth URL params captured before createClient runs.
 *  Read-only after module initialisation; null when no auth params were present. */
export const initialAuthParams: Readonly<SupabaseAuthParams> | null = snapshotAuthParams();

// On the reset-password route the singleton must not touch the URL — the page
// handles all token exchange itself. Everywhere else keep the default behaviour.
const detectSessionInUrl =
  typeof window === 'undefined' ||
  !window.location.pathname.startsWith('/reset-password');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl,
  },
});
