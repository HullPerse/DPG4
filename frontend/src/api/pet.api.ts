import { apiFetch } from "./client.api";
import type { PetState, DailyRewardResult, ResurrectResult, SearchResult } from "@/types/pet";

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

export function resurrectPet(userId: string): Promise<ResurrectResult> {
  return apiFetch<ResurrectResult>(`/pets/${userId}/resurrect`, { method: "POST" });
}

export function searchDeadPet(userId: string): Promise<SearchResult> {
  return apiFetch<SearchResult>(`/pets/${userId}/search`, { method: "POST" });
}

export function setPetColor(userId: string, color: string): Promise<PetState> {
  return apiFetch<PetState>(`/pets/${userId}/color`, {
    method: "POST",
    body: { color },
  });
}

export function setPetModel(userId: string, model: string): Promise<PetState> {
  return apiFetch<PetState>(`/pets/${userId}/model`, {
    method: "POST",
    body: { model },
  });
}
