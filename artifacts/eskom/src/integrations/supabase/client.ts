const BASE_URL = "/api";

function getToken(): string | null {
  return localStorage.getItem("eskom_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest(path: string, options: RequestInit = {}): Promise<{ data: any; error: any }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...((options.headers as Record<string, string>) ?? {}),
      },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { data: null, error: json?.error ?? "Request failed" };
    return { data: json, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

export const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const phone = email.replace("@users.eskom.app", "");
      const { data, error } = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, password }),
      });
      if (data?.token) localStorage.setItem("eskom_token", data.token);
      return { data: data ? { user: { id: data.userId, email } } : null, error: error ? { message: error } : null };
    },

    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      const phone = email.replace("@users.eskom.app", "");
      const inviteCode = options?.data?.inviteCode;
      const { data, error } = await apiRequest("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ phone, password, countryCode: options?.data?.countryCode, referralCode: inviteCode }),
      });
      if (data?.token) localStorage.setItem("eskom_token", data.token);
      return { data: data ? { user: { id: data.userId, email } } : null, error: error ? { message: error } : null };
    },

    signOut: async () => {
      await apiRequest("/auth/logout", { method: "POST" });
      localStorage.removeItem("eskom_token");
      return { error: null };
    },

    getSession: async () => {
      const token = getToken();
      if (!token) return { data: { session: null }, error: null };
      const { data, error } = await apiRequest("/auth/me");
      if (error || !data) return { data: { session: null }, error: null };
      return { data: { session: { user: { id: data.userId, email: `${data.phone}@users.eskom.app` } } }, error: null };
    },

    getUser: async () => {
      const token = getToken();
      if (!token) return { data: { user: null }, error: null };
      const { data, error } = await apiRequest("/auth/me");
      if (error || !data) return { data: { user: null }, error: null };
      return { data: { user: { id: data.userId, email: `${data.phone}@users.eskom.app` } }, error: null };
    },

    updateUser: async (updates: any) => {
      const { data, error } = await apiRequest("/profiles/me", {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      return { data, error: error ? { message: error } : null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      const token = getToken();
      setTimeout(() => {
        if (token) {
          apiRequest("/auth/me").then(({ data }) => {
            if (data) callback("SIGNED_IN", { user: { id: data.userId } });
            else callback("SIGNED_OUT", null);
          });
        } else {
          callback("SIGNED_OUT", null);
        }
      }, 0);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },

  from: (table: string) => new QueryBuilder(table),

  rpc: async (fn: string, args?: any) => {
    const { data, error } = await apiRequest(`/rpc/${fn}`, {
      method: "POST",
      body: JSON.stringify(args ?? {}),
    });
    return { data, error: error ? { message: error } : null };
  },

  storage: {
    from: (bucket: string) => ({
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `/api/storage/${bucket}/${path}` },
      }),
      upload: async (path: string, file: File, _options?: any) => {
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch(`${BASE_URL}/storage/${bucket}/${path}`, {
            method: "POST",
            headers: authHeaders(),
            body: formData,
          });
          if (!res.ok) return { error: { message: "Upload failed" } };
          return { error: null };
        } catch (err) {
          return { error: { message: String(err) } };
        }
      },
    }),
  },

  functions: {
    invoke: async (fn: string, options?: { body?: any }) => {
      const { data, error } = await apiRequest(`/functions/${fn}`, {
        method: "POST",
        body: JSON.stringify(options?.body ?? {}),
      });
      return { data, error: error ? { message: error } : null };
    },
  },

  channel: (_name: string) => ({
    on: (..._args: any[]) => ({ subscribe: () => ({}) }),
  }),

  removeChannel: (_channel: any) => {},
};

type FilterValue = string | number | boolean | null;

class QueryBuilder {
  private table: string;
  private _select = "*";
  private _filters: Array<{ type: string; col: string; val: string }> = [];
  private _order: { col: string; asc: boolean } | null = null;
  private _limit: number | null = null;
  private _single = false;
  private _maybeSingle = false;
  private _method = "GET";
  private _body: any = null;
  private _upsert = false;
  private _countOnly = false;

  constructor(table: string) {
    this.table = table;
  }

  select(cols: string, options?: { count?: string; head?: boolean }) {
    this._select = cols;
    if (options?.head && options?.count === "exact") this._countOnly = true;
    return this;
  }
  eq(col: string, val: FilterValue) { this._filters.push({ type: "eq", col, val: String(val) }); return this; }
  neq(col: string, val: FilterValue) { this._filters.push({ type: "neq", col, val: String(val) }); return this; }
  gt(col: string, val: FilterValue) { this._filters.push({ type: "gt", col, val: String(val) }); return this; }
  gte(col: string, val: FilterValue) { this._filters.push({ type: "gte", col, val: String(val) }); return this; }
  lt(col: string, val: FilterValue) { this._filters.push({ type: "lt", col, val: String(val) }); return this; }
  lte(col: string, val: FilterValue) { this._filters.push({ type: "lte", col, val: String(val) }); return this; }
  in(col: string, vals: FilterValue[]) { this._filters.push({ type: "in", col, val: vals.map(String).join(",") }); return this; }

  order(col: string, options?: { ascending?: boolean }) {
    this._order = { col, asc: options?.ascending !== false };
    return this;
  }

  limit(n: number) { this._limit = n; return this; }
  single() { this._single = true; this._limit = 1; return this; }
  maybeSingle() { this._maybeSingle = true; this._limit = 1; return this; }

  insert(rows: any | any[]) { this._method = "POST"; this._body = Array.isArray(rows) ? rows : [rows]; return this; }
  update(data: any) { this._method = "PATCH"; this._body = data; return this; }
  upsert(data: any) { this._method = "POST"; this._body = data; this._upsert = true; return this; }
  delete() { this._method = "DELETE"; return this; }
  returning() { return this; }

  private buildUrl() {
    const params = new URLSearchParams();
    params.set("table", this.table);
    params.set("select", this._select);
    for (const f of this._filters) params.append("filter", `${f.type}:${f.col}:${f.val}`);
    if (this._order) params.set("order", `${this._order.col}:${this._order.asc ? "asc" : "desc"}`);
    if (this._limit) params.set("limit", String(this._limit));
    if (this._upsert) params.set("upsert", "true");
    return `/db?${params.toString()}`;
  }

  private isJoinSelect(): boolean {
    return /\w+\s*\(/.test(this._select);
  }

  private async executeCountQuery(): Promise<{ data: null; error: any; count: number | null }> {
    const params = new URLSearchParams();
    params.set("table", this.table);
    params.set("count", "exact");
    for (const f of this._filters) params.append("filter", `${f.type}:${f.col}:${f.val}`);
    const { data, error } = await apiRequest(`/db?${params.toString()}`);
    return { data: null, error: error ? { message: error } : null, count: data?.count ?? null };
  }

  async then(resolve: (result: { data: any; error: any; count?: number | null }) => void) {
    try {
      if (this._countOnly) {
        const result = await this.executeCountQuery();
        resolve(result);
        return;
      }

      // Route user_products JOIN queries to dedicated endpoint
      if (this.table === "user_products" && this.isJoinSelect() && this._method === "GET") {
        const { data, error } = await apiRequest("/user-products/my");
        let rows = data ?? [];
        // Apply client-side filters for any eq filters already specified
        for (const f of this._filters) {
          if (f.type === "eq") {
            rows = rows.filter((r: any) => String(r[f.col] ?? r[f.col.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())]) === f.val);
          }
        }
        if (this._order) {
          const col = this._order.col;
          const asc = this._order.asc;
          rows = [...rows].sort((a: any, b: any) => {
            const av = a[col] ?? "", bv = b[col] ?? "";
            return asc ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
          });
        }
        resolve({ data: error ? null : rows, error: error ? { message: error } : null });
        return;
      }

      const url = this.buildUrl();
      let result: { data: any; error: any };
      if (this._method === "GET") {
        result = await apiRequest(url);
      } else {
        result = await apiRequest(url, {
          method: this._method,
          body: JSON.stringify(this._body),
        });
      }

      let { data, error } = result;
      if ((this._single || this._maybeSingle) && Array.isArray(data)) {
        data = data[0] ?? null;
      }
      resolve({ data, error: error ? { message: error } : null });
    } catch (err) {
      resolve({ data: null, error: { message: String(err) } });
    }
  }
}
