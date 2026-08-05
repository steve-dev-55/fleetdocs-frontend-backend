// FleetDocs — API client (Vite edition)
// Talks to the FastAPI backend at VITE_API_URL.

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Extrait un message d'erreur lisible depuis une ApiError ou une Error standard.
 * Gère les formats de réponses d'erreur FastAPI/Pydantic :
 *   - {detail: "string"} → "string"
 *   - {detail: [{msg: "..."}, ...]} → "msg1, msg2, ..."
 *   - {message: "string"} → "string"
 *   - Error standard → err.message
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as Record<string, unknown> | undefined;
    const detail = body?.detail;

    // FastAPI validation error: {detail: [{msg: "...", ...}, ...]}
    if (Array.isArray(detail)) {
      const messages = detail
        .map((d: Record<string, unknown>) => d?.msg as string)
        .filter(Boolean);
      if (messages.length > 0) {
        return messages.join(", ");
      }
    }

    // FastAPI error: {detail: "string"}
    if (typeof detail === "string") {
      return detail;
    }

    // Generic error: {message: "string"}
    if (typeof body?.message === "string") {
      return body.message;
    }

    // Fallback to the error message
    return err.message || `HTTP ${err.status}`;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return "Une erreur inattendue s'est produite.";
}

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("fleetdocs_token");
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem("fleetdocs_token", token);
    else localStorage.removeItem("fleetdocs_token");
  } catch {
    /* ignore */
  }
}

interface ApiOptions {
  signal?: AbortSignal;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await res.json();
    if (!res.ok) {
      throw new ApiError(
        body?.detail ?? body?.message ?? `HTTP ${res.status}`,
        res.status,
        body
      );
    }
    return body as T;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || `HTTP ${res.status}`, res.status, text);
  }
  return (await res.text()) as unknown as T;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string, opts?: ApiOptions): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    signal: opts?.signal,
  });
  return parseResponse<T>(res);
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  opts?: ApiOptions
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: opts?.signal,
  });
  return parseResponse<T>(res);
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  opts?: ApiOptions
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
  return parseResponse<T>(res);
}

export async function apiDelete<T>(
  path: string,
  opts?: ApiOptions
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    signal: opts?.signal,
  });
  return parseResponse<T>(res);
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  opts?: ApiOptions
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { ...authHeaders() },
    credentials: "include",
    body: formData,
    signal: opts?.signal,
  });
  return parseResponse<T>(res);
}

// Convenience wrapper object (matches the spec)
export const api = {
  get: <T>(path: string) => apiGet<T>(path),
  post: <T>(path: string, body?: unknown) => apiPost<T>(path, body),
  put: <T>(path: string, body: unknown) => apiPut<T>(path, body),
  delete: <T>(path: string) => apiDelete<T>(path),
  upload: <T>(path: string, formData: FormData) => apiUpload<T>(path, formData),
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};
