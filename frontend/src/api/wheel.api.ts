import { apiFetch } from "./client.api";
import type { WheelItem } from "@/types/wheel";

export type SpinResponse = {
  shuffled: WheelItem[];
  winnerIndex: number;
};

export type WheelHistoryRecord = {
  id: string;
  userId: string;
  owner: { id: string; username: string } | null;
  itemId: string;
  itemLabel: string;
  itemImage: string;
  itemType: string;
  listType: string;
  cost: number;
  free: boolean;
  created: string;
};

export type WheelHistoryResponse = {
  data: WheelHistoryRecord[];
  total: number;
  page: number;
  limit: number;
};

export function spinWheel(items: WheelItem[], free: boolean, listType?: string) {
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
