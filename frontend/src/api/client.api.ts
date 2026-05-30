//both ips are local so we good
const VITE_API_URL = "http://127.0.0.1:3000";
const VITE_WS_URL = "ws://127.0.0.1:3000/ws";

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

export async function checkConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${URL}/health`);
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

  const res = await fetch(`${URL}${path}`, {
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
