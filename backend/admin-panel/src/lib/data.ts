import { getAdminToken } from "./auth";

const apiUrl = "/api/admin/data";

function toQuery(params: Record<string, string>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (!entries.length) return "";
  return `?${entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")}`;
}

async function adminJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<{ json: T; headers: Headers }> {
  const token = getAdminToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  const json = (await res.json()) as T;
  return { json, headers: res.headers };
}

export type ListParams = {
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
  filter?: Record<string, unknown>;
};

export async function listRecords(
  resource: string,
  params: ListParams = {},
) {
  const { page = 1, perPage = 25, sortField = "created", sortOrder = "ASC", filter = {} } =
    params;
  const q: Record<string, string> = {
    _sort: sortField,
    _order: sortOrder,
    _page: String(page),
    _perPage: String(perPage),
  };
  for (const [k, v] of Object.entries(filter)) {
    if (v !== undefined && v !== null && v !== "") q[k] = String(v);
  }
  const { json, headers } = await adminJson<{ data: Record<string, unknown>[]; total?: number }>(
    `${apiUrl}/${resource}${toQuery(q)}`,
  );
  return {
    data: json.data,
    total: Number(headers.get("X-Total-Count") ?? json.total ?? json.data.length),
  };
}

export async function getRecord(resource: string, id: string) {
  const { json } = await adminJson<{ data: Record<string, unknown> }>(
    `${apiUrl}/${resource}/${id}`,
  );
  return json.data;
}

export async function createRecord(
  resource: string,
  data: Record<string, unknown>,
) {
  const { json } = await adminJson<{ data: Record<string, unknown> }>(
    `${apiUrl}/${resource}`,
    { method: "POST", body: JSON.stringify(data) },
  );
  return json.data;
}

export async function updateRecord(
  resource: string,
  id: string,
  data: Record<string, unknown>,
) {
  const { json } = await adminJson<{ data: Record<string, unknown> }>(
    `${apiUrl}/${resource}/${id}`,
    { method: "PUT", body: JSON.stringify(data) },
  );
  return json.data;
}

export async function deleteRecord(resource: string, id: string) {
  const { json } = await adminJson<{ data: Record<string, unknown> }>(
    `${apiUrl}/${resource}/${id}`,
    { method: "DELETE" },
  );
  return json.data;
}
