export type EffectCtx = {
  userId: string;
  inventoryId: string;
  label: string;
};

export type EffectHandler = (ctx: EffectCtx) => Promise<string | null>;

export type UseItemResult =
  | { ok: true; mode: "done" }
  | { ok: true; mode: "modal"; label: string }
  | { ok: false; error: string };
