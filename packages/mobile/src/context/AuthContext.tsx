import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../services/auth';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Current Supabase session (null = not logged in) */
  session:   Session | null;
  /** Convenience shorthand for session.user */
  user:      User | null;
  /** True while restoring session from SecureStore on startup */
  isLoading: boolean;
  /** True once a valid session has been confirmed */
  isAuthed:  boolean;
  /** Signs the user out, clears SecureStore, resets context state */
  signOut:   () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  session:   null,
  user:      null,
  isLoading: true,
  isAuthed:  false,
  signOut:   async () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,   setSession]   = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1. Subscribe to Supabase auth events FIRST so we catch the restore event.
    //    This handles: login, token auto-refresh, logout, and session restore.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);

        if (newSession) {
          // Keep our backup copies up to date (handles auto-refresh too)
          await Promise.all([
            SecureStore.setItemAsync(ACCESS_TOKEN_KEY,  newSession.access_token),
            SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newSession.refresh_token),
          ]);
        } else {
          // Signed out — clear our backup copies
          await Promise.all([
            SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
            SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
          ]);
        }
      }
    );

    // 2. On startup: read stored tokens and restore the session explicitly.
    //    Calling setSession() handles expired access tokens by using the
    //    refresh_token to get a new pair — something getSession() alone cannot do.
    const restore = async () => {
      try {
        const [accessToken, refreshToken] = await Promise.all([
          SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
          SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        ]);

        if (accessToken && refreshToken) {
          const { data } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          });
          // Set state directly in case onAuthStateChange fires after setIsLoading
          if (mounted && data.session) {
            setSession(data.session);
          }
        }
      } catch {
        // No valid stored session — user must log in
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    restore();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // signOut is stable — onAuthStateChange will clear SecureStore automatically
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user:     session?.user ?? null,
        isLoading,
        isAuthed: !!session,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
