//both ips are local so we good
export const VITE_API_URL = "http://26.236.31.194:3000";
const VITE_WS_URL = "ws://26.236.31.194:3000/ws";

const URL = VITE_API_URL ?? "http://127.0.0.1:3000";
export const WS_URL = VITE_WS_URL ?? URL.replace(/^http/, "ws") + "/ws";

const TOKEN_KEY = "dpg_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort());
  }

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries = MAX_RETRIES,
): Promise<Response> {
  const method = options.method ?? "GET";
  const isGet = method === "GET";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithTimeout(url, options, timeoutMs);
    } catch (err) {
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof DOMException && err.name === "AbortError");

      if (attempt < retries && isNetworkError && isGet) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * 2 ** attempt));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Request failed");
}

export async function checkConnection(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${URL}/health`, {}, 3000);
    return res.ok;
  } catch {
    return false;
  }
}

type ApiOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();
  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const method = options.method ?? (options.body ? "POST" : "GET");

  const res = await fetchWithRetry(
    `${URL}${path}`,
    {
      method,
      cache: undefined,
      headers,
      signal: options.signal,
      body:
        options.body === undefined
          ? undefined
          : options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body),
    },
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  if (!text.trim()) return undefined as T;

  return JSON.parse(text) as T;
}

type FileRecord = {
  id?: string;
  collectionName?: string;
  hasImage?: boolean;
  hasAudio?: boolean;
  imageMime?: string | null;
  audioMime?: string | null;
};

function hasFile(
  record: FileRecord | null | undefined,
  field: "image" | "audio" = "image",
): boolean {
  if (!record?.id) return false;
  if (field === "image") {
    if ("hasImage" in record) return Boolean(record.hasImage);
    if ("imageMime" in record) return Boolean(record.imageMime);
  }
  if (field === "audio") {
    if ("hasAudio" in record) return Boolean(record.hasAudio);
    if ("audioMime" in record) return Boolean(record.audioMime);
  }
  return false;
}

export function getFileUrl(
  record: FileRecord | null | undefined,
  field: string = "image",
  entity?: string,
): string | null {
  if (!record?.id) return null;
  if (field === "image" || field === "audio") {
    if (!hasFile(record, field as "image" | "audio")) return null;
  }
  const table = entity ?? record.collectionName;
  if (!table) return null;
  return `${URL}/files/${table}/${record.id}/${field}`;
}
