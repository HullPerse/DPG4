import { convertFileSrc } from "@tauri-apps/api/core";

/** Local filesystem path → URL for `<img src>` in the webview (asset protocol). */
export function wallpaperAssetUrl(filePath: string): string {
  return convertFileSrc(filePath);
}
