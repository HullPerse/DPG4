import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { Db } from "@/types";

export type InventoryAction =
  | "receive"
  | "send"
  | "sell"
  | "buy"
  | "use"
  | "delete"
  | "grant"
  | "trade_out"
  | "trade_in"
  | "market_list"
  | "market_unlist"
  | "charge_change";

export class InventoryLogService {
  constructor(private db: Db) {}

  async log(
    action: InventoryAction,
    inventoryId: string,
    owner: string,
    actor?: string,
    details?: Record<string, unknown>,
  ) {
    const [inv] = await this.db
      .select()
      .from(schema.inventory)
      .where(eq(schema.inventory.id, inventoryId));

    const id = newId();
    const ts = nowIso();
    await this.db.insert(schema.inventoryLog).values({
      id,
      inventoryId,
      itemLabel: inv?.label ?? "unknown",
      itemType: inv?.type ?? "other",
      owner,
      action,
      actor: actor ?? null,
      details: details ?? null,
      created: ts,
    });
    return id;
  }

  async logFromData(
    action: InventoryAction,
    inventoryId: string,
    itemLabel: string,
    itemType: string,
    owner: string,
    actor?: string,
    details?: Record<string, unknown>,
  ) {
    const id = newId();
    const ts = nowIso();
    await this.db.insert(schema.inventoryLog).values({
      id,
      inventoryId,
      itemLabel,
      itemType,
      owner,
      action,
      actor: actor ?? null,
      details: details ?? null,
      created: ts,
    });
    return id;
  }
}
