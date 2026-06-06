import { apiFetch } from "./client.api";

export type HistoryRecord = {
  id: string;
  userId: string;
  owner: { id: string; username: string } | null;
  type: "wheel" | "dice" | "blackjack" | "rocket" | "pachinko";
  label: string;
  image: string;
  bid: number;
  payout: number;
  net: number;
  data: Record<string, unknown> | null;
  created: string;
};

export type HistoryResponse = {
  data: HistoryRecord[];
  total: number;
  page: number;
  limit: number;
};

export function getHistory(
  page = 1,
  limit = 50,
  type?: string,
) {
  let url = `/history?page=${page}&limit=${limit}`;
  if (type) url += `&type=${type}`;
  return apiFetch<HistoryResponse>(url);
}
