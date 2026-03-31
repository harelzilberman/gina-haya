import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const TOKEN_KEY         = 'gina_haya_token';

// Supabase client using SecureStore for session persistence
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: {
      getItem:    (key) => SecureStore.getItemAsync(key),
      setItem:    (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken:  true,
    persistSession:    true,
    detectSessionInUrl: false,
  },
});

export async function login(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (data.session?.access_token) {
    await SecureStore.setItemAsync(TOKEN_KEY, data.session.access_token);
  }
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getToken(): Promise<string | null> {
  // Prefer live session token (auto-refreshed) over stored snapshot
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) return data.session.access_token;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function isLoggedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}
