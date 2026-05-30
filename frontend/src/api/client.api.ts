//both ips are local so we good
const VITE_API_URL = "http://26.15.36.191:3000";
const VITE_WS_URL = "ws://26.15.36.191:3000/ws";

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

const DEFAULT_FETCH_TIMEOUT_MS = 5000;

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function checkConnection(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

type ApiOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
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

  let res: Response;
  try {
    res = await fetchWithTimeout(`${URL}${path}`, {
      method,
      cache: method === "GET" ? "no-store" : undefined,
      headers,
      body:
        options.body === undefined
          ? undefined
          : options.body instanceof FormData
            ? options.body
            : JSON.stringify(options.body),
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("Сервер недоступен");
    }
    throw e;
  }

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
