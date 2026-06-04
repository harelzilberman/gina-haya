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
  // The redirect URI must match exactly what's in Supabase allowed list
  // In dev: exp://192.168.0.123:8081/--/auth-callback
  // In prod: ginahaya://auth-callback
  const redirectTo = Linking.createURL('auth-callback');

  console.log('🔴 [AUTH] redirectTo:', redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    console.log('🔴 [AUTH] OAuth URL error:', error.message);
    throw error;
  }
  if (!data?.url) throw new Error('No OAuth URL returned');

  console.log('🔴 [AUTH] Opening browser with URL:', data.url.substring(0, 80) + '...');

  // openAuthSessionAsync uses Chrome Custom Tabs on Android
  // It intercepts redirects to our scheme and returns them
  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectTo,
  );

  console.log('🔴 [AUTH] Browser result type:', result.type);

  if (result.type !== 'success') {
    throw new Error('Google sign-in was cancelled or failed');
  }

  const callbackUrl = result.url;
  console.log('🔴 [AUTH] Callback URL received:', callbackUrl);

  // PKCE flow: Supabase returns a code, not tokens directly
  // exchangeCodeForSession handles the code → token exchange
  const { data: sessionData, error: sessionError } =
    await supabase.auth.exchangeCodeForSession(callbackUrl);

  console.log('🔴 [AUTH] Session exchange result:', !!sessionData?.session, sessionError?.message);

  if (sessionError) throw sessionError;
  if (!sessionData?.session) throw new Error('Session exchange failed');

  console.log('🔴 [AUTH] ✅ Login successful!');
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
