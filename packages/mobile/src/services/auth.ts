import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const ACCESS_TOKEN_KEY  = 'gina_haya_access_token';
export const REFRESH_TOKEN_KEY = 'gina_haya_refresh_token';

// PKCE flow is required for mobile OAuth
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
    flowType: 'pkce',
  },
});

export async function signInWithGoogle(): Promise<void> {
  const redirectTo = __DEV__
    ? 'ginahaya://auth-callback'
    : 'ginahaya://auth-callback';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) throw new Error(error?.message ?? 'OAuth error');

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectTo,
  );

  if (result.type !== 'success') {
    throw new Error('התחברות בוטלה');
  }

  const { error: sessionError } =
    await supabase.auth.exchangeCodeForSession(result.url);

  if (sessionError) throw sessionError;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function isLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}
