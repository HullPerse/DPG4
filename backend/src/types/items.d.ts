export interface EffectCtx {
  userId: string;
  inventoryId: string;
  label: string;
}

export interface UseItemResult {
  ok: boolean;
  error?: string;
  mode?: "modal" | "done";
  label?: string;
}