import { isTauri } from "@tauri-apps/api/core";

export async function notifyPrivateMessage(
  title: string,
  body: string,
): Promise<void> {
  if (!isTauri()) return;

  try {
    const { isPermissionGranted, requestPermission, sendNotification } =
      await import("@tauri-apps/plugin-notification");
    let granted = await isPermissionGranted();
    if (!granted) {
      const perm = await requestPermission();
      granted = perm === "granted";
    }
    if (!granted) return;
    sendNotification({ title, body });
  } catch {
    /* plugin optional */
  }
}
