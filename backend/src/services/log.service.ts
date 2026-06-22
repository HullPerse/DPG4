import type { Db } from "@/types/server";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { newId, nowIso } from "@/lib/index.utils";
import type { InventoryAction } from "@/types/services";

export default class LogService {
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
