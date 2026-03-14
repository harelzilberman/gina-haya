import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { api } from '../api/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) set({ error: error.message, isLoading: false });
    // session is set by onAuthStateChange
  },

  signUp: async (email, password, displayName) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) {
      set({ error: error.message, isLoading: false });
      return;
    }
    // Sync profile to public.users (best-effort — trigger handles the INSERT)
    if (data.session) {
      try {
        await api.post('/api/auth/profile', { displayName }, data.session.access_token);
      } catch {
        // non-fatal — trigger already created the row
      }
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) set({ error: error.message, isLoading: false });
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    await supabase.auth.signOut();
    set({ user: null, session: null, isLoading: false });
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    set({ isLoading: false });
    if (error) set({ error: error.message });
  },
}));

// ── Bootstrap: restore session + subscribe to changes ─────────────────────

supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.setState({
    user: session?.user ?? null,
    session,
    isLoading: false,
  });
});

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState({
    user: session?.user ?? null,
    session,
    isLoading: false,
  });
});
