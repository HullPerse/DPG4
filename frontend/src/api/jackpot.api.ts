import { apiFetch } from "./client.api";
import type { JackpotStatus, JackpotPlayResult } from "@/types/gamble";

function withDev(body: Record<string, unknown>, overrides?: Record<string, unknown>): Record<string, unknown> {
  return overrides && Object.keys(overrides).length > 0 ? { ...body, ...overrides } : body;
}

export async function getJackpotStatus(): Promise<JackpotStatus> {
  return apiFetch<JackpotStatus>("/utils/jackpot", {
    method: "GET",
  });
}

export async function playJackpot(devOverrides?: Record<string, unknown>): Promise<JackpotPlayResult> {
  return apiFetch<JackpotPlayResult>("/utils/jackpot/play", {
    method: "POST",
    body: withDev({}, devOverrides),
  });
}