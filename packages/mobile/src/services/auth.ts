import * as SecureStore from 'expo-secure-store';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { createClient } from '@supabase/supabase-js';

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

export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: '417815147012-h4a52rrmeleq0kfgops6pg0ugu4u9s1a.apps.googleusercontent.com',
    iosClientId: undefined,
  });
}

export async function signInWithGoogle(): Promise<void> {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const idToken = userInfo.data?.idToken ?? (userInfo as any).idToken;

    console.log('🔴 Got ID token:', !!idToken);

    if (!idToken) throw new Error('No ID token');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    console.log('🔴 Supabase result:', !!data.session, error);
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('🔴 Cancelled');
    } else {
      console.log('🔴 Error:', error);
    }
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
