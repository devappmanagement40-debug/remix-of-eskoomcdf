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

export const supabase = {
  auth: {
    getSession: async () => {
      const local = getLocalSession();
      return { data: { session: local }, error: null };
    },
    getUser: async () => {
      const local = getLocalSession();
      return { data: { user: local?.user ?? null }, error: null };
    },
    setSession: async (creds: { access_token: string; refresh_token: string }) => {
      const localSession = getLocalSession();
      const user = localSession?.user ?? { id: "unknown" };
      setLocalSession(creds.access_token, user);
      return { data: { session: getLocalSession(), user }, error: null };
    },
    signOut: async () => {
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
    },
    onAuthStateChange: (callback: (event: string, session: LocalSession | null) => void) => {
      return localAuth.onAuthStateChange(callback);
    },
  },
  from: (_table: string) => {
    console.warn(`supabase.from("${_table}") called — migrate this to /api calls`);
    const stub = {
      select: (..._args: unknown[]) => stub,
      insert: (..._args: unknown[]) => stub,
      update: (..._args: unknown[]) => stub,
      delete: (..._args: unknown[]) => stub,
      upsert: (..._args: unknown[]) => stub,
      eq: (..._args: unknown[]) => stub,
      neq: (..._args: unknown[]) => stub,
      gt: (..._args: unknown[]) => stub,
      gte: (..._args: unknown[]) => stub,
      lt: (..._args: unknown[]) => stub,
      lte: (..._args: unknown[]) => stub,
      like: (..._args: unknown[]) => stub,
      ilike: (..._args: unknown[]) => stub,
      in: (..._args: unknown[]) => stub,
      is: (..._args: unknown[]) => stub,
      order: (..._args: unknown[]) => stub,
      limit: (..._args: unknown[]) => stub,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: (v: { data: null; error: null }) => void) => Promise.resolve({ data: null, error: null }).then(resolve),
    };
    return stub;
  },
  channel: (_name: string) => ({
    on: (..._args: unknown[]) => ({ subscribe: () => {} }),
    subscribe: () => {},
  }),
  removeChannel: (_channel: unknown) => {},
} as unknown as import("@supabase/supabase-js").SupabaseClient;
