/**
 * Thin client for the Laravel backend in /backend.
 * Points at VITE_API_BASE_URL (default http://localhost:8000/api).
 */

// Default to a relative "/api" so the browser hits the same origin that served
// the page; Vite proxies /api → the Laravel backend (see vite.config.ts). Set
// VITE_API_BASE_URL only when calling Laravel on a different origin.
const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

export type WorkflowAction =
  | "submit"
  | "startReview"
  | "requestChanges"
  | "forward"
  | "approve"
  | "lock";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Laravel API ${res.status} ${res.statusText}: ${body}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const qs = (params: Record<string, unknown> = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return entries.length ? `?${new URLSearchParams(entries as [string, string][]).toString()}` : "";
};

function crud<T = unknown, C = Partial<T>, U = Partial<T>>(resource: string) {
  return {
    list:   (filters: Record<string, unknown> = {}) => request<T[]>(`/${resource}${qs(filters)}`),
    get:    (id: string) => request<T>(`/${resource}/${id}`),
    create: (payload: C) => request<T>(`/${resource}`, { method: "POST", body: JSON.stringify(payload) }),
    update: (id: string, payload: U) =>
      request<T>(`/${resource}/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    patch:  (id: string, payload: U) =>
      request<T>(`/${resource}/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    remove: (id: string) => request<void>(`/${resource}/${id}`, { method: "DELETE" }),
  };
}

export const laravelApi = {
  health: () => request<{ ok: boolean; engine: string; schemaVersion: number }>("/health"),

  users:       crud("users"),
  communities: crud("communities"),
  teams:       crud("teams"),
  kpis:        crud("kpis"),
  actionPlans: {
    ...crud("action-plans"),
    addUpdate: (id: string, body: { authorId: string; note: string; progressPercentage?: number; status?: string }) =>
      request<unknown>(`/action-plans/${id}/updates`, { method: "POST", body: JSON.stringify(body) }),
    approve: (id: string, body: { actorId: string }) =>
      request<unknown>(`/action-plans/${id}/approve`, { method: "POST", body: JSON.stringify(body) }),
  },

  periods: {
    ...crud("periods"),
    setCurrent: (id: string) =>
      request<unknown>(`/periods/${id}/set-current`, { method: "POST" }),
  },

  submissions: {
    ...crud("submissions"),
    transition: (id: string, action: WorkflowAction, body: { actorId: string; notes?: string }) =>
      request<unknown>(`/submissions/${id}/${action}`, { method: "POST", body: JSON.stringify(body) }),
  },

  audit: {
    list: (filters: Record<string, unknown> = {}) => request<unknown[]>(`/audit${qs(filters)}`),
    get:  (id: string) => request<unknown>(`/audit/${id}`),
  },

  notifications: {
    list:   (filters: Record<string, unknown> = {}) => request<unknown[]>(`/notifications${qs(filters)}`),
    create: (body: unknown) => request<unknown>(`/notifications`, { method: "POST", body: JSON.stringify(body) }),
    markRead:    (id: string) => request<unknown>(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllRead: (filters: Record<string, string> = {}) =>
      request<{ updated: number }>(`/notifications/mark-all-read`, { method: "POST", body: JSON.stringify(filters) }),
    remove: (id: string) => request<void>(`/notifications/${id}`, { method: "DELETE" }),
  },
};
