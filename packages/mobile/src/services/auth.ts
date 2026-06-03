import * as SecureStore from 'expo-secure-store';
import * as AuthSession from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { createClient } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

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
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'ginahaya',
    path: 'auth',
  });

  console.log('🔴 Redirect URI:', redirectUri);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    console.log('🔴 OAuth error:', error);
    return;
  }

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectUri,
  );

  console.log('🔴 Result type:', result.type);

  if (result.type !== 'success') return;

  console.log('🔴 Result URL:', result.url);

  const { params, errorCode } = QueryParams.getQueryParams(result.url);

  console.log('🔴 Params:', JSON.stringify(params));
  console.log('🔴 Error code:', errorCode);

  if (params.access_token && params.refresh_token) {
    await supabase.auth.setSession({
      access_token: params.access_token as string,
      refresh_token: params.refresh_token as string,
    });
    console.log('🔴 Session set!');
  } else if (params.code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code as string);
    console.log('🔴 Code exchange:', exchangeError);
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
