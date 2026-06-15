import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_PROJECT_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

const LOCAL_TOKEN_KEY = "ge_auth_token";
const LOCAL_USER_KEY = "ge_auth_user";

type AuthListener = (event: string, session: LocalSession | null) => void;
const listeners: AuthListener[] = [];

export type LocalSession = {
  access_token: string;
  refresh_token: string;
  user: { id: string; email?: string };
};

function getLocalSession(): LocalSession | null {
  try {
    const token = localStorage.getItem(LOCAL_TOKEN_KEY);
    const userStr = localStorage.getItem(LOCAL_USER_KEY);
    if (!token || !userStr) return null;
    const user = JSON.parse(userStr);
    return { access_token: token, refresh_token: "", user };
  } catch {
    return null;
  }
}

function setLocalSession(token: string, user: { id: string; email?: string }) {
  localStorage.setItem(LOCAL_TOKEN_KEY, token);
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  const session: LocalSession = { access_token: token, refresh_token: "", user };
  listeners.forEach((fn) => fn("SIGNED_IN", session));
}

function clearLocalSession() {
  localStorage.removeItem(LOCAL_TOKEN_KEY);
  localStorage.removeItem(LOCAL_USER_KEY);
  listeners.forEach((fn) => fn("SIGNED_OUT", null));
}

export function getAuthToken(): string | null {
  return localStorage.getItem(LOCAL_TOKEN_KEY);
}

export const localAuth = {
  setSession(token: string, user: { id: string; email?: string }) {
    setLocalSession(token, user);
  },

  clearSession() {
    clearLocalSession();
  },

  getSession(): LocalSession | null {
    return getLocalSession();
  },

  getUserId(): string | null {
    return getLocalSession()?.user?.id ?? null;
  },

  onAuthStateChange(fn: AuthListener): { data: { subscription: { unsubscribe: () => void } } } {
    listeners.push(fn);
    const session = getLocalSession();
    setTimeout(() => fn(session ? "SIGNED_IN" : "SIGNED_OUT", session), 0);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const idx = listeners.indexOf(fn);
            if (idx !== -1) listeners.splice(idx, 1);
          },
        },
      },
    };
  },
};

const _origAuth = supabase.auth;

const patchedGetSession = async () => {
  const local = getLocalSession();
  if (local) {
    return { data: { session: local as unknown as Awaited<ReturnType<typeof _origAuth.getSession>>["data"]["session"] }, error: null };
  }
  return _origAuth.getSession();
};

const patchedGetUser = async () => {
  const local = getLocalSession();
  if (local) {
    return { data: { user: local.user as unknown as Awaited<ReturnType<typeof _origAuth.getUser>>["data"]["user"] }, error: null };
  }
  return _origAuth.getUser();
};

const patchedSetSession = async (creds: { access_token: string; refresh_token: string }) => {
  if (creds.access_token && creds.access_token.length < 500 && !creds.access_token.includes(".")) {
    const localSession = getLocalSession();
    const user = localSession?.user ?? { id: "unknown" };
    setLocalSession(creds.access_token, user);
    return { data: { session: getLocalSession() as unknown as Awaited<ReturnType<typeof _origAuth.setSession>>["data"]["session"], user: getLocalSession()?.user as unknown as Awaited<ReturnType<typeof _origAuth.setSession>>["data"]["user"] }, error: null };
  }
  return _origAuth.setSession(creds);
};

const patchedSignOut = async () => {
  const token = getAuthToken();
  if (token) {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }
  clearLocalSession();
  return { error: null };
};

const patchedOnAuthStateChange = (callback: Parameters<typeof _origAuth.onAuthStateChange>[0]) => {
  const wrappedCallback: AuthListener = (event, session) => {
    callback(event as Parameters<typeof callback>[0], session as Parameters<typeof callback>[1]);
  };
  return localAuth.onAuthStateChange(wrappedCallback);
};

(supabase as unknown as { auth: Record<string, unknown> }).auth = {
  ...(_origAuth as unknown as Record<string, unknown>),
  getSession: patchedGetSession,
  getUser: patchedGetUser,
  setSession: patchedSetSession,
  signOut: patchedSignOut,
  onAuthStateChange: patchedOnAuthStateChange,
  signInWithPassword: _origAuth.signInWithPassword.bind(_origAuth),
  updateUser: _origAuth.updateUser.bind(_origAuth),
};
