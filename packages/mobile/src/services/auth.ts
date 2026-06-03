import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { createClient } from '@supabase/supabase-js';

// maybeCompleteAuthSession() is called in App.tsx on all platforms for OAuth deep link handling.

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Exported so AuthContext and callers can use the same keys
export const ACCESS_TOKEN_KEY  = 'gina_haya_access_token';
export const REFRESH_TOKEN_KEY = 'gina_haya_refresh_token';

// Supabase client using SecureStore for session persistence
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: {
      getItem:    (key) => SecureStore.getItemAsync(key),
      setItem:    (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});

export async function login(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (data.session) {
    // Store BOTH tokens — refresh_token is required to restore the session after restart
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY,  data.session.access_token),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.session.refresh_token),
    ]);
  }
}

export async function signInWithGoogle(): Promise<void> {
  // Warm up the browser for faster OAuth
  await WebBrowser.warmUpAsync();

  try {
    __DEV__
      ? AuthSession.makeRedirectUri({ scheme: 'ginahaya', path: 'auth' })
      : AuthSession.makeRedirectUri({ scheme: 'ginahaya', path: 'auth' });

    // Force native scheme always
    const finalRedirect = 'ginahaya://auth';
    console.log('🔴 DEV BUILD REDIRECT URI:', finalRedirect);
    console.log('🔴 OAUTH URL will be:', `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/authorize`);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: finalRedirect, skipBrowserRedirect: true },
    });
    console.log('🔴 OAUTH ERROR:', error);
    console.log('🔴 OAUTH URL:', data?.url);
    if (error) throw new Error(error.message);
    if (!data.url) throw new Error('לא התקבל URL לאימות');

    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      finalRedirect,
      {
        showInRecents: true,
        createTask: false,
      }
    );
    if (result.type !== 'success') return;

    // Parse tokens from the redirect URL fragment
    const url    = result.url;
    const hash   = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
    const params = Object.fromEntries(new URLSearchParams(hash));

    if (params.access_token && params.refresh_token) {
      await supabase.auth.setSession({
        access_token:  params.access_token,
        refresh_token: params.refresh_token,
      });
      // Store BOTH tokens for session restoration on restart
      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY,  params.access_token),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, params.refresh_token),
      ]);
    }
  } finally {
    // Clean up the browser
    await WebBrowser.coolDownAsync();
  }
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync('gina_haya_token').catch(() => {}), // remove legacy key
  ]);
}

export async function getToken(): Promise<string | null> {
  // Prefer live session token (auto-refreshed by Supabase)
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) return data.session.access_token;
  // Fall back to stored access token (used when Supabase session not yet restored)
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function isLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}
