import { eq, desc } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import type { Db } from "@/types/server";
import { newId, nowIso } from "@/lib/index.utils";

interface EventPayload {
  [key: string]: unknown;
  amount?: number;
  itemLabel?: string;
  itemId?: string;
  gameId?: string;
  gameName?: string;
  status?: string;
  tradeId?: string;
}

export default class EventService {
  constructor(private db: Db) {}

  async write(
    type: string,
    actorId: string | undefined,
    targetId: string | undefined,
    payload: EventPayload = {},
  ) {
    const id = newId();
    await this.db.insert(schema.events).values({
      id,
      type,
      actorId: actorId ?? null,
      targetId: targetId ?? null,
      payload: JSON.stringify(payload),
      created: nowIso(),
    });
    return id;
  }

  async forTarget(targetId: string) {
    return this.db
      .select()
      .from(schema.events)
      .where(eq(schema.events.targetId, targetId))
      .orderBy(desc(schema.events.created))
      .limit(50);
  }

  async forActor(actorId: string) {
    return this.db
      .select()
      .from(schema.events)
      .where(eq(schema.events.actorId, actorId))
      .orderBy(desc(schema.events.created))
      .limit(50);
  }

  async recent(limit = 100) {
    return this.db
      .select()
      .from(schema.events)
      .orderBy(desc(schema.events.created))
      .limit(limit);
  }
}
