import { adminFetch, clearAdminSession, getAdminToken, setAdminSession } from "@/adminApi";

export {
  getAdminToken,
  getAdminUser,
  clearAdminSession,
  setAdminSession,
} from "@/adminApi";
export type { AdminUser } from "@/adminApi";

export async function login(username: string, password: string) {
  const res = await fetch("/api/admin/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Неверный логин или пароль");
  }
  const data = (await res.json()) as {
    token: string;
    user: { id: string; username: string };
  };
  setAdminSession(data.token, data.user);
}

export async function verifySession() {
  const token = getAdminToken();
  if (!token) throw new Error("Not authenticated");
  await adminFetch("/api/admin/verify");
}

export function logout() {
  clearAdminSession();
}
