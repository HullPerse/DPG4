import { fetchUtils } from "react-admin";

const STORAGE_KEY = "dpg_admin_token";

const httpClient: typeof fetchUtils.fetchJson = (url, options = {}) => {
  const token = localStorage.getItem(STORAGE_KEY);
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  return fetchUtils.fetchJson(url, { ...options, headers });
};

const apiUrl = "/api/admin/data";

function toQuery(params: Record<string, string>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}

export const dataProvider = {
  getList: async (resource: string, params: { pagination?: { page?: number; perPage?: number }; sort?: { field?: string; order?: string }; filter?: Record<string, unknown> }) => {
    const { page = 1, perPage = 50 } = params.pagination ?? {};
    const { field = "id", order = "ASC" } = params.sort ?? {};
    const q: Record<string, string> = {
      _sort: field,
      _order: order,
      _page: String(page),
      _perPage: String(perPage),
    };
    if (params.filter) {
      Object.entries(params.filter).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") q[k] = String(v);
      });
    }
    const url = `${apiUrl}/${resource}${toQuery(q)}`;
    const { json, headers } = await httpClient(url);
    return {
      data: json.data,
      total: Number(headers.get("X-Total-Count") ?? json.total ?? json.data.length),
    };
  },

  getOne: async (resource: string, params: { id: string | number }) => {
    const { json } = await httpClient(`${apiUrl}/${resource}/${params.id}`);
    return { data: json.data };
  },

  getManyReference: async (resource: string, params: { target: string; id: string | number; pagination?: { page?: number; perPage?: number }; sort?: { field?: string; order?: string }; filter?: Record<string, unknown> }) => {
    const { page = 1, perPage = 50 } = params.pagination ?? {};
    const { field = "id", order = "ASC" } = params.sort ?? {};
    const q: Record<string, string> = {
      _sort: field,
      _order: order,
      _page: String(page),
      _perPage: String(perPage),
      [params.target]: String(params.id),
    };
    if (params.filter) {
      Object.entries(params.filter).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") q[k] = String(v);
      });
    }
    const url = `${apiUrl}/${resource}${toQuery(q)}`;
    const { json, headers } = await httpClient(url);
    return {
      data: json.data,
      total: Number(headers.get("X-Total-Count") ?? json.total ?? json.data.length),
    };
  },

  getMany: async (resource: string, params: { ids: (string | number)[] }) => {
    const { json } = await httpClient(`${apiUrl}/${resource}${toQuery({ _ids: params.ids.join(",") })}`);
    return { data: json.data };
  },

  create: async (resource: string, params: { data: Record<string, unknown> }) => {
    const { json } = await httpClient(`${apiUrl}/${resource}`, {
      method: "POST",
      body: JSON.stringify(params.data),
    });
    return { data: json.data };
  },

  update: async (resource: string, params: { id: string | number; data: Record<string, unknown> }) => {
    const { json } = await httpClient(`${apiUrl}/${resource}/${params.id}`, {
      method: "PUT",
      body: JSON.stringify(params.data),
    });
    return { data: json.data };
  },

  delete: async (resource: string, params: { id: string | number }) => {
    const { json } = await httpClient(`${apiUrl}/${resource}/${params.id}`, {
      method: "DELETE",
    });
    return { data: json.data };
  },

  deleteMany: async (resource: string, params: { ids: (string | number)[] }) => {
    const results = await Promise.all(
      params.ids.map((id) =>
        httpClient(`${apiUrl}/${resource}/${id}`, { method: "DELETE" }).then((r) => r.json.data),
      ),
    );
    return { data: results };
  },

  updateMany: async (resource: string, params: { ids: (string | number)[]; data: Record<string, unknown> }) => {
    const results = await Promise.all(
      params.ids.map((id) =>
        httpClient(`${apiUrl}/${resource}/${id}`, {
          method: "PUT",
          body: JSON.stringify(params.data),
        }).then((r) => r.json.data),
      ),
    );
    return { data: results };
  },
};
