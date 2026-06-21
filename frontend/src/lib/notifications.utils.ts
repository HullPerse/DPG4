import { isTauri } from "@tauri-apps/api/core";

export async function notifyPrivateMessage(title: string, body: string): Promise<void> {
  if (!isTauri()) return;

  const { isPermissionGranted, requestPermission, sendNotification } =
    await import("@tauri-apps/plugin-notification");

  const granted = await isPermissionGranted();

  if (!granted && (await requestPermission()) !== "granted") return;

  return sendNotification({ title, body });
}
