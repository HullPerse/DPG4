import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "@/db/schema.db";
import { newId, nowIso } from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";

type Db = BunSQLiteDatabase<typeof schema>;

export abstract class BaseService {
  constructor(protected db: Db) {}

  protected newId(): string {
    return newId();
  }

  protected ts() {
    return { created: nowIso(), updated: nowIso() };
  }

  protected touch() {
    return { updated: nowIso() };
  }

  protected async findById<T>(table: any, id: string): Promise<T | null> {
    const [row] = await this.db.select().from(table).where(eq(table.id, id));
    return (row as T) ?? null;
  }

  protected async insertOne(
    table: any,
    values: Record<string, unknown>,
    channel: string,
  ): Promise<string> {
    const id = this.newId();
    await this.db.insert(table).values({
      ...values,
      id,
      created: nowIso(),
      updated: nowIso(),
    });
    broadcast(channel, "create", id);
    return id;
  }

  protected async updateOne(
    table: any,
    id: string,
    values: Record<string, unknown>,
    channel: string,
  ): Promise<void> {
    await this.db
      .update(table)
      .set({ ...values, updated: nowIso() })
      .where(eq(table.id, id));
    broadcast(channel, "update", id);
  }

  protected async deleteOne(
    table: any,
    id: string,
    channel: string,
  ): Promise<void> {
    await this.db.delete(table).where(eq(table.id, id));
    broadcast(channel, "delete", id);
  }
}
