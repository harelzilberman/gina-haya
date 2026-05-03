import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { useOnboardingStore } from './onboardingStore';

function syncOnboardingComplete(profile: { onboarding_complete: boolean } | null) {
  if (profile?.onboarding_complete) {
    useOnboardingStore.setState({ isComplete: true });
  }
}

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  language_preference: 'he' | 'en';
  subscription_tier: string;
  onboarding_complete: boolean;
  daily_tip_email: boolean;
  latitude?: number;
  active_garden_id?: string | null;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthReady: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loadProfile: () => Promise<void>;
  markOnboardingComplete: () => void;
  clearError: () => void;
}

// Load profile using the user's own access token so RLS passes
async function fetchProfile(userId: string, accessToken: string): Promise<UserProfile | null> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*`,
    {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) return data[0];
  return null;
}

// Create profile row using the user's own access token
async function createProfile(user: User, accessToken: string): Promise<UserProfile | null> {
  const displayName =
    user.user_metadata?.display_name ||
    user.email?.split('@')[0] ||
    'גנן';

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users`,
    {
      method: 'POST',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        display_name: displayName,
        language_preference: 'he',
        subscription_tier: 'free',
        onboarding_complete: false,
        daily_tip_email: true,
      }),
    }
  );
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) return data[0];
  return null;
}

async function loadOrCreateProfile(user: User, accessToken: string): Promise<UserProfile | null> {
  let profile = await fetchProfile(user.id, accessToken);
  if (!profile) {
    profile = await createProfile(user, accessToken);
  }

  const displayName = profile?.display_name;
  const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
  if (!displayName && metaName) {
    await supabase
      .from('users')
      .update({ display_name: metaName })
      .eq('id', user.id);
    console.log('[auth] Synced displayName from metadata:', metaName);
    if (profile) profile = { ...profile, display_name: metaName };
  }

  return profile;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  isLoading: false,
  isAuthReady: false,
  error: null,

  clearError: () => set({ error: null }),

  markOnboardingComplete: () => {
    const { profile } = get();
    if (profile) {
      set({ profile: { ...profile, onboarding_complete: true } });
    }
  },

  loadProfile: async () => {
    const { user, session } = get();
    if (!user || !session?.access_token) return;
    const profile = await loadOrCreateProfile(user, session.access_token);
    set({ profile });
    syncOnboardingComplete(profile);
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({ user: data.user, session: data.session });
      if (data.session?.access_token) {
        const profile = await loadOrCreateProfile(data.user, data.session.access_token);
        set({ profile });
        syncOnboardingComplete(profile);
      }
    } catch (err: any) {
      set({ error: err.message || 'Sign in failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, displayName) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split('@')[0] },
        },
      });
      if (error) throw error;
      set({ user: data.user, session: data.session });
      if (data.user && data.session?.access_token) {
        const profile = await loadOrCreateProfile(data.user, data.session.access_token);
        set({ profile });
        syncOnboardingComplete(profile);
      }
    } catch (err: any) {
      set({ error: err.message || 'Sign up failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
    } catch (err: any) {
      set({ error: err.message || 'Google sign in failed' });
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, session: null });
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    } catch (err: any) {
      set({ error: err.message || 'Password reset failed' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Auth state listener
supabase.auth.onAuthStateChange(async (event, session) => {
  useAuthStore.setState({
    user: session?.user ?? null,
    session: session,
    isAuthReady: true,
  });
  if (session?.user && session.access_token) {
    const profile = await loadOrCreateProfile(session.user, session.access_token);
    useAuthStore.setState({ profile });
    syncOnboardingComplete(profile);
  } else {
    useAuthStore.setState({ profile: null });
  }
});

// Load session on startup
supabase.auth.getSession().then(async ({ data: { session } }) => {
  useAuthStore.setState({
    user: session?.user ?? null,
    session: session,
    isAuthReady: true,
  });
  if (session?.user && session.access_token) {
    const profile = await loadOrCreateProfile(session.user, session.access_token);
    useAuthStore.setState({ profile });
    syncOnboardingComplete(profile);
  }
});
