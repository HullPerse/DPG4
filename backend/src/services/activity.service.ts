import { desc } from "drizzle-orm";
import type { Db } from "@/types/server";
import * as schema from "@/db/schema.db";
import { BaseService } from "./index.service";
import type { Activity } from "@/types/services";
import { ACTIVITY_TYPES, withRecordMeta } from "@/lib/index.utils";
import { broadcast } from "@/lib/websocket.utils";

export default class ActivityService extends BaseService {
  constructor(db: Db) {
    super(db);
  }

  async create(data: Activity) {
    const id = this.newId();
    const created = this.ts().created;

    await this.db.insert(schema.activity).values({
      id,
      author: data.author ?? null,
      image: data.image ?? null,
      type: data.type ?? ACTIVITY_TYPES.EMOJI,
      text: data.text,
      created,
    });

    broadcast("activity", "create", id);

    return withRecordMeta(
      {
        id,
        author: data.author ?? null,
        image: data.image ?? null,
        type: data.type ?? ACTIVITY_TYPES.EMOJI,
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
    const row = await this.findById<typeof schema.activity.$inferSelect>(
      schema.activity,
      id,
    );

    return row
      ? withRecordMeta({ ...row, updated: row.created }, "activity")
      : null;
  }
}
