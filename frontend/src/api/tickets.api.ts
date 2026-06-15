import { BuyTicketsResponse, TicketInfo } from "@/types/gamble";
import { apiFetch } from "./client.api";

export async function getTicketInfo(): Promise<TicketInfo> {
  return apiFetch<TicketInfo>("/utils/tickets", { method: "GET" });
}

export async function buyTickets(amount: number): Promise<BuyTicketsResponse> {
  return apiFetch<BuyTicketsResponse>("/utils/tickets/buy", {
    method: "POST",
    body: { amount },
  });
}

export interface SellDirectResponse {
  ok: boolean;
  payout: number;
  newBalance: number;
}

export async function sellTicketsDirect(
  amount: number,
): Promise<SellDirectResponse> {
  return apiFetch<SellDirectResponse>("/utils/tickets/sell-direct", {
    method: "POST",
    body: { amount },
  });
}

export async function sellTickets(
  quantity: number,
  perTicketPrice: number,
): Promise<void> {
  return apiFetch("/utils/tickets/sell", {
    method: "POST",
    body: { quantity, perTicketPrice },
  });
}

export async function buyMarketTicket(marketId: string): Promise<void> {
  return apiFetch(`/market/tickets/${marketId}/buy`, { method: "POST" });
}

export async function removeMarketTicket(marketId: string): Promise<void> {
  return apiFetch(`/market/tickets/${marketId}/remove`, { method: "POST" });
}
