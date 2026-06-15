import { apiFetch } from "./client.api";
import type { SpinResponse, WheelItem } from "@/types/wheel";

export function spinWheel(
  items: WheelItem[],
  free: boolean,
  listType?: string,
) {
  return apiFetch<SpinResponse>("/wheel/spin", {
    method: "POST",
    body: { items, free, listType },
    timeoutMs: 15000,
  });
}
