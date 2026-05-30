import { Elysia, t } from "elysia";
import { eq, desc, asc } from "drizzle-orm";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { parseFileInput } from "../lib/files";
import { withRecordMeta } from "../lib/record";
import { broadcast } from "../lib/ws";
import { getUserById } from "../services/user.service";

function mapChat(row: typeof schema.chats.$inferSelect) {
  return {
    ...withRecordMeta({ ...row, updated: row.created }, "chats"),
    isRead: row.isRead,
  };
}

import { dbPlugin } from "../plugins/db.plugin";

export const chatsRoute = new Elysia({ prefix: "/chats" })
  .use(dbPlugin)
  .get("/", async ({ db, query }) => {
    const rows = await db.select().from(schema.chats);
    let list = rows;

    if (query.receiverId && query.senderId) {
      list = rows.filter((c) => {
        const d = c.data as {
          sender?: { id: string };
          receiver?: { id: string };
        };
        const a = d.sender?.id;
        const b = d.receiver?.id;
        const s = query.senderId!;
        const r = query.receiverId!;
        return (a === s && b === r) || (a === r && b === s);
      });
    } else if (query.receiverId === "global") {
      list = rows.filter(
        (c) =>
          (c.data as { receiver?: { id: string } })?.receiver?.id === "global",
      );
    } else if (query.unreadFor) {
      list = rows.filter(
        (c) =>
          (c.data as { receiver?: { id: string } })?.receiver?.id ===
            query.unreadFor && !c.isRead,
      );
    }

    const sort = query.sort === "created" ? asc(schema.chats.created) : desc(schema.chats.created);
    list.sort((a, b) =>
      query.sort === "created"
        ? a.created.localeCompare(b.created)
        : b.created.localeCompare(a.created),
    );

    return list.map(mapChat);
  })
  .post("/", async ({ body, db }) => {
    const id = newId();
    const created = nowIso();
    const imageFile = parseFileInput(body.image);

    let data = body.data;
    if (body.senderId && body.receiverId) {
      const sender = await getUserById(db, body.senderId);
      const isGlobal = body.receiverId === "global";
      const receiver = isGlobal
        ? null
        : await getUserById(db, body.receiverId);

      data = {
        sender: {
          id: body.senderId,
          username: sender?.username ?? "",
          avatar: sender?.avatar ?? "",
          color: sender?.color ?? "",
        },
        receiver: isGlobal
          ? {
              id: "global",
              username: "Глобальный чат",
              avatar: "🌐",
              color: "#f6c177",
            }
          : {
              id: body.receiverId,
              username: receiver?.username ?? "",
              avatar: receiver?.avatar ?? "",
              color: receiver?.color ?? "",
            },
      };
    }

    await db.insert(schema.chats).values({
      id,
      data,
      message: body.message ?? "",
      image: imageFile?.data ?? null,
      imageMime: imageFile?.mime ?? null,
      isRead: false,
      created,
    });

    broadcast("chats", "create", id);
    const [row] = await db
      .select()
      .from(schema.chats)
      .where(eq(schema.chats.id, id));
    return mapChat(row!);
  })
  .patch("/:id", async ({ params, body, db }) => {
    const patch: Partial<typeof schema.chats.$inferInsert> = {};
    if (body.message !== undefined) patch.message = body.message;
    if (body.isRead !== undefined) patch.isRead = body.isRead;
  await db.update(schema.chats).set(patch).where(eq(schema.chats.id, params.id));
    broadcast("chats", "update", params.id);
    const [row] = await db
      .select()
      .from(schema.chats)
      .where(eq(schema.chats.id, params.id));
    return mapChat(row!);
  })
  .post("/mark-read", async ({ body, db }) => {
    for (const id of body.ids) {
      await db
        .update(schema.chats)
        .set({ isRead: true })
        .where(eq(schema.chats.id, id));
      broadcast("chats", "update", id);
    }
    return { ok: true };
  })
  .delete("/:id", async ({ params, db }) => {
    await db.delete(schema.chats).where(eq(schema.chats.id, params.id));
    broadcast("chats", "delete", params.id);
    return { ok: true };
  })
  .get("/thread/:sender/:receiver", async ({ params, db }) => {
    const chats = await db.select().from(schema.chats);
    const filtered = chats.filter((c) => {
      const d = c.data as {
        sender?: { id: string };
        receiver?: { id: string };
      };
      const s = params.sender;
      const r = params.receiver;
      return (
        (d.sender?.id === s && d.receiver?.id === r) ||
        (d.sender?.id === r && d.receiver?.id === s)
      );
    });
    const user = await getUserById(db, params.receiver);
    return {
      chat: filtered.map(mapChat),
      user,
    };
  })
  .get("/:id", async ({ params, db, set }) => {
    const [row] = await db
      .select()
      .from(schema.chats)
      .where(eq(schema.chats.id, params.id));
    if (!row) {
      set.status = 404;
      return { error: "Not found" };
    }
    return mapChat(row);
  });
