import { apiFetch } from "./client.api";
import type { RecordMeta } from "@/types/record";

export type QuestReward = {
  type: "item" | "money";
  value: string | number;
};

export type Quest = RecordMeta & {
  label: string;
  description: string;
  claimed: string[];
  reward: QuestReward[];
};

export default class QuestsApi {
  getAll = async (): Promise<Quest[]> => {
    return apiFetch<Quest[]>("/quests");
  };

  getById = async (id: string): Promise<Quest> => {
    return apiFetch<Quest>(`/quests/${id}`);
  };

  create = async (data: {
    label: string;
    description?: string;
    reward?: QuestReward[];
  }): Promise<Quest> => {
    return apiFetch<Quest>("/quests", {
      method: "POST",
      body: data,
    });
  };

  update = async (
    id: string,
    data: Partial<{
      label: string;
      description: string;
      reward: QuestReward[];
      claimed: string[];
    }>,
  ): Promise<Quest> => {
    return apiFetch<Quest>(`/quests/${id}`, {
      method: "PATCH",
      body: data,
    });
  };

  delete = async (id: string): Promise<void> => {
    return apiFetch(`/quests/${id}`, { method: "DELETE" });
  };

  claim = async (id: string, userId: string): Promise<void> => {
    return apiFetch(`/quests/${id}/claim`, {
      method: "POST",
      body: { userId },
    });
  };
}
