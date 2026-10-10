import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

interface AuthResult {
  error: string | null;
}

interface SignUpResult extends AuthResult {
  /** True when the project requires email confirmation before sign-in. */
  needsConfirmation: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  /** False until the stored session has been resolved (configured only). */
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  // Unconfigured apps never gate on auth, so treat them as already resolved.
  initialized: !isSupabaseConfigured,

  signIn: async (email, password) => {
    if (!supabase) return { error: null };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    // Set the session immediately so navigation doesn't race the auth listener.
    if (data.session) {
      set({ session: data.session, user: data.session.user, initialized: true });
    }
    return { error: null };
  },

  signUp: async (email, password) => {
    if (!supabase) return { error: null, needsConfirmation: false };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, needsConfirmation: false };
    if (data.session) {
      set({ session: data.session, user: data.session.user, initialized: true });
    }
    // No session back = the project has "Confirm email" enabled.
    return { error: null, needsConfirmation: !data.session };
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ session: null, user: null });
  }
}));

let listening = false;

/** Resolve the stored session and subscribe to auth changes. Idempotent. */
export function initAuth() {
  if (!isSupabaseConfigured || !supabase || listening) return;
  listening = true;

  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.setState({
      session: data.session,
      user: data.session?.user ?? null,
      initialized: true
    });
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({
      session,
      user: session?.user ?? null,
      initialized: true
    });
  });
}
