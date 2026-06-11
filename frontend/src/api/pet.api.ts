import { apiFetch } from "./client.api";
import type { PetState, DailyRewardResult } from "@/types/pet";

export function getPet(userId: string): Promise<PetState> {
  return apiFetch<PetState>(`/pets/${userId}`);
}

export function feedPet(userId: string): Promise<PetState> {
  return apiFetch<PetState>(`/pets/${userId}/feed`, { method: "POST" });
}

export function petPet(userId: string): Promise<PetState> {
  return apiFetch<PetState>(`/pets/${userId}/pet`, { method: "POST" });
}

export function sleepPet(userId: string): Promise<PetState> {
  return apiFetch<PetState>(`/pets/${userId}/sleep`, { method: "POST" });
}

export function claimDailyReward(userId: string): Promise<DailyRewardResult> {
  return apiFetch<DailyRewardResult>(`/pets/${userId}/daily-reward`, { method: "POST" });
}
