import { apiFetch } from "./client.api";
import type { JackpotStatus, JackpotPlayResult } from "@/types/gamble";

export async function getJackpotStatus(): Promise<JackpotStatus> {
  return apiFetch<JackpotStatus>("/utils/jackpot", {
    method: "GET",
  });
}

export async function playJackpot(): Promise<JackpotPlayResult> {
  return apiFetch<JackpotPlayResult>("/utils/jackpot/play", {
    method: "POST",
  });
}