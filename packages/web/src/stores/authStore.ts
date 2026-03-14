import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { api } from '../api/client';

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  language_preference: 'he' | 'en';
  subscription_tier: string;
  onboarding_complete: boolean;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  markOnboardingComplete: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  markOnboardingComplete: () =>
    set((s) => ({
      profile: s.profile ? { ...s.profile, onboarding_complete: true } : null,
    })),

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) set({ error: error.message, isLoading: false });
    // session + profile set by onAuthStateChange
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
    set({ user: null, session: null, profile: null, isLoading: false });
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

// ── Helpers ────────────────────────────────────────────────────────────────

async function fetchProfile(token: string): Promise<UserProfile | null> {
  try {
    return await api.get<UserProfile>('/api/auth/me', token);
  } catch {
    return null;
  }
}

// ── Bootstrap ──────────────────────────────────────────────────────────────

supabase.auth.getSession().then(async ({ data: { session } }) => {
  if (session?.user) {
    const profile = await fetchProfile(session.access_token);
    useAuthStore.setState({ user: session.user, session, profile, isLoading: false });
  } else {
    useAuthStore.setState({ user: null, session: null, profile: null, isLoading: false });
  }
});

supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    const profile = await fetchProfile(session.access_token);
    useAuthStore.setState({ user: session.user, session, profile, isLoading: false });
  } else {
    useAuthStore.setState({ user: null, session: null, profile: null, isLoading: false });
  }
});
