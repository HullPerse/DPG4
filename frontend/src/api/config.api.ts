import { ModelConfigEntry, UiConfig } from "@/types/config";
import { apiFetch } from "./client.api";

export async function fetchUiConfig(): Promise<UiConfig> {
  return apiFetch<UiConfig>("/utils/config", { method: "GET" });
}

export async function fetchModelConfigs(): Promise<ModelConfigEntry[]> {
  return apiFetch<ModelConfigEntry[]>("/utils/model-configs", {
    method: "GET",
  });
}
