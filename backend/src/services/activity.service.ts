import { eq, desc } from "drizzle-orm";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { withRecordMeta } from "../lib/record";
import { broadcast } from "../lib/ws";
import { Db } from "@/types";

export class ActivityService {
  constructor(private db: Db) {}

  async create(data: {
    author?: string;
    image?: string;
    type?: string;
    text: string;
  }) {
    const id = newId();
    const created = nowIso();
    await this.db.insert(schema.activity).values({
      id,
      author: data.author ?? null,
      image: data.image ?? null,
      type: data.type ?? "emoji",
      text: data.text,
      created,
    });
    broadcast("activity", "create", id);
    return withRecordMeta(
      {
        id,
        author: data.author ?? null,
        image: data.image ?? null,
        type: data.type ?? "emoji",
        text: data.text,
        created,
        updated: created,
      },
      "activity",
    );
  }

  async list(limit = 50, offset = 0) {
    const rows = await this.db
      .select()
      .from(schema.activity)
      .orderBy(desc(schema.activity.created))
      .limit(limit)
      .offset(offset);
    return rows.map((r) =>
      withRecordMeta({ ...r, updated: r.created }, "activity"),
    );
  }

  async getLatest() {
    const [row] = await this.db
      .select()
      .from(schema.activity)
      .orderBy(desc(schema.activity.created))
      .limit(1);
    return row
      ? withRecordMeta({ ...row, updated: row.created }, "activity")
      : null;
  }

  async getById(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.activity)
      .where(eq(schema.activity.id, id));
    return row
      ? withRecordMeta({ ...row, updated: row.created }, "activity")
      : null;
  }
}
