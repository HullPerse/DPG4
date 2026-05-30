import type { AuthProvider } from "react-admin";

const STORAGE_KEY = "dpg_admin_token";

export const authProvider: AuthProvider = {
  async login({ username, password }) {
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error || "Invalid credentials");
    }
    const { token } = await res.json();
    localStorage.setItem(STORAGE_KEY, token);
  },

  async logout() {
    localStorage.removeItem(STORAGE_KEY);
  },

  async checkAuth() {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) throw new Error("Not authenticated");
    const res = await fetch("/api/admin/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      localStorage.removeItem(STORAGE_KEY);
      throw new Error("Session expired");
    }
  },

  async checkError(error) {
    if (error.status === 401 || error.status === 403) {
      localStorage.removeItem(STORAGE_KEY);
      throw new Error("Session expired");
    }
  },

  async getPermissions() {
    return "admin";
  },

  async getIdentity() {
    return { id: "admin", fullName: "Admin" };
  },
};
