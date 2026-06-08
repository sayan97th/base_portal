const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const TOKEN_KEY         = "access_token";
const TOKEN_EXPIRES_KEY = "token_expires_at";
const REMEMBER_ME_KEY   = "remember_me";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  responseType?: "json" | "blob";
};

/** Returns true when the current session was created with "keep me logged in". */
function isRemembered(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(REMEMBER_ME_KEY) === "true";
}

/**
 * Reads the token from whichever storage holds it.
 * localStorage  → remember-me session
 * sessionStorage → session-only login
 */
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

/**
 * Persists the token and sets the access_token cookie.
 * remember=true  → localStorage + 30-day cookie
 * remember=false → sessionStorage + session cookie (cleared when browser closes)
 */
function setToken(token: string, remember: boolean = true): void {
  if (typeof window === "undefined") return;
  if (remember) {
    localStorage.setItem(REMEMBER_ME_KEY, "true");
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
    document.cookie = `access_token=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  } else {
    localStorage.removeItem(REMEMBER_ME_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.setItem(TOKEN_KEY, token);
    // No max-age → session cookie, cleared when the browser is closed.
    document.cookie = `access_token=${token}; path=/; SameSite=Lax`;
  }
}

/** Reads the token expiry timestamp from whichever storage holds it. */
function getTokenExpiry(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_EXPIRES_KEY) || sessionStorage.getItem(TOKEN_EXPIRES_KEY);
}

/** Persists the token expiry timestamp in the same storage as the token. */
function setTokenExpiry(value: string, remember: boolean = true): void {
  if (typeof window === "undefined") return;
  if (remember) {
    localStorage.setItem(TOKEN_EXPIRES_KEY, value);
    sessionStorage.removeItem(TOKEN_EXPIRES_KEY);
  } else {
    sessionStorage.setItem(TOKEN_EXPIRES_KEY, value);
    localStorage.removeItem(TOKEN_EXPIRES_KEY);
  }
}

function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_KEY);
  localStorage.removeItem(REMEMBER_ME_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRES_KEY);
  document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const token = getToken();
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      const remember = isRemembered();
      setToken(data.access_token, remember);
      setTokenExpiry((Date.now() + data.expires_in * 1000).toString(), remember);
      return data.access_token as string;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, responseType, headers: customHeaders, ...restOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(customHeaders as Record<string, string>),
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Forward the tab-scoped session ID so the server can populate
  // *_by_session_id in broadcast payloads, letting other tabs skip
  // re-applying mutations they didn't originate.
  const session_id =
    typeof window !== "undefined" ? sessionStorage.getItem("bo_session_id") : null;
  if (session_id) {
    headers["X-Session-Id"] = session_id;
  }

  const config: RequestInit = {
    ...restOptions,
    headers,
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // If 401, try refresh and retry once
  if (response.status === 401 && token) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      config.headers = headers;
      response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    } else {
      removeToken();
      if (typeof window !== "undefined") {
        window.location.href = "/signin";
      }
      throw new Error("Session expired");
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: "An unexpected error occurred",
    }));
    throw { ...errorData, status_code: response.status };
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  if (responseType === "blob") {
    return response.blob() as Promise<T>;
  }

  return response.json();
}

async function requestFormData<T>(endpoint: string, form_data: FormData, method: string = "POST"): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
    body: form_data,
  };

  let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401 && token) {
    const new_token = await tryRefreshToken();
    if (new_token) {
      headers["Authorization"] = `Bearer ${new_token}`;
      config.headers = headers;
      response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    } else {
      removeToken();
      if (typeof window !== "undefined") {
        window.location.href = "/signin";
      }
      throw new Error("Session expired");
    }
  }

  if (!response.ok) {
    const error_data = await response.json().catch(() => ({
      message: "An unexpected error occurred",
    }));
    throw { ...error_data, status_code: response.status };
  }

  return response.json();
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "POST", body }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),

  postFormData: <T>(endpoint: string, form_data: FormData) =>
    requestFormData<T>(endpoint, form_data, "POST"),
};

export { setToken, removeToken, getToken, getTokenExpiry, setTokenExpiry, isRemembered };
