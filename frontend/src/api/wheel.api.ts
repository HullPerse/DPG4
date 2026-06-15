import { apiFetch } from "./client.api";
import type {
  SpinResponse,
  WheelHistoryResponse,
  WheelItem,
} from "@/types/wheel";

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

export function getWheelHistory(page = 1, limit = 50) {
  return apiFetch<WheelHistoryResponse>(
    `/wheel/history?page=${page}&limit=${limit}`,
  );
}

export function clearWheelHistory() {
  return apiFetch<{ ok: boolean }>("/wheel/history", {
    method: "DELETE",
  });
}
