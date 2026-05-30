import type { AuthProvider } from "react-admin";
import {
  adminFetch,
  clearAdminSession,
  getAdminToken,
  getAdminUser,
  setAdminSession,
} from "./adminApi";

export const authProvider: AuthProvider = {
  async login({ username, password }) {
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Invalid credentials");
    }
    const data = (await res.json()) as {
      token: string;
      user: { id: string; username: string };
    };
    setAdminSession(data.token, data.user);
  },

  async logout() {
    clearAdminSession();
  },

  async checkAuth() {
    const token = getAdminToken();
    if (!token) throw new Error("Not authenticated");
    const res = await adminFetch<{
      ok: boolean;
      id: string;
      username: string;
    }>("/api/admin/verify");
    if (!res.ok) {
      clearAdminSession();
      throw new Error("Session expired");
    }
    setAdminSession(token, { id: res.id, username: res.username });
  },

  async checkError(error) {
    if (error.status === 401 || error.status === 403) {
      clearAdminSession();
      throw new Error("Session expired");
    }
  },

  async getPermissions() {
    return "admin";
  },

  async getIdentity() {
    const user = getAdminUser();
    if (user) {
      return { id: user.id, fullName: user.username };
    }
    return { id: "admin", fullName: "Admin" };
  },
};
