import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { parseFileInput } from "../lib/files";
import { withRecordMeta } from "../lib/record";
import { broadcast } from "../lib/ws";
import { logger } from "../lib/logger";
import { createActivity } from "../services/activity.service";
import { changeUserStatus, getUserById, scoreUser } from "../services/user.service";

export const SUBSCRIPTION_COST = 2;

import { dbPlugin } from "../plugins/db.plugin";

export const adsRoute = new Elysia({ prefix: "/ads" })
  .use(dbPlugin)
  .get("/", async ({ db }) => {
    const rows = await db.select().from(schema.ads);
    return rows.map((r) => withRecordMeta(r, "ads"));
  })
  .post(
    "/",
    async ({ body, db }) => {
      const id = newId();
      const ts = nowIso();
      const imageFile = parseFileInput(body.image);
      const audioFile = parseFileInput(body.audio);

      await db.insert(schema.ads).values({
        id,
        owner: body.owner,
        text: body.text ?? "",
        image: imageFile?.data ?? null,
        imageMime: imageFile?.mime ?? null,
        audio: audioFile?.data ?? null,
        audioMime: audioFile?.mime ?? null,
        created: ts,
        updated: ts,
      });

      broadcast("ads", "create", id);
      const ownerName = (body.owner as { username?: string } | undefined)?.username;
      logger.info(ownerName ?? null, "created ad", body.text);
      return withRecordMeta(
        (await db.select().from(schema.ads).where(eq(schema.ads.id, id)))[0]!,
        "ads",
      );
    },
    {
      body: t.Object({
        owner: t.Any(),
        text: t.Optional(t.String()),
        image: t.Optional(t.Any()),
        audio: t.Optional(t.Any()),
      }),
    },
  )
  .delete("/:id", async ({ params, db }) => {
    await db.delete(schema.ads).where(eq(schema.ads.id, params.id));
    broadcast("ads", "delete", params.id);
    logger.info(null, "deleted ad", params.id);
    return { ok: true };
  })
  .post(
    "/subscribe",
    async ({ body, db }) => {
      const user = await getUserById(db, body.userId);
      if (!user || user.money < SUBSCRIPTION_COST) {
        logger.info(user?.username ?? null, "subscription failed", "insufficient funds");
        return { ok: false };
      }

      await scoreUser(db, body.userId, -SUBSCRIPTION_COST);
      await changeUserStatus(db, body.userId, "subscribed", "add");

      await createActivity(db, {
        author: body.userId,
        image: user.avatar,
        text: `${user.username} оформил подписку за ${SUBSCRIPTION_COST} чубриков`,
      });

      logger.info(user.username, "subscribed");
      return { ok: true };
    },
    { body: t.Object({ userId: t.String() }) },
  )
  .post(
    "/unsubscribe",
    async ({ body, db }) => {
      const user = await getUserById(db, body.userId);
      if (!user) return { ok: false };

      await changeUserStatus(db, body.userId, "subscribed", "remove");
      await createActivity(db, {
        author: body.userId,
        image: user.avatar,
        text: `${user.username} не хватило денег на подписку`,
      });
      logger.info(user.username, "unsubscribed");
      return { ok: true };
    },
    { body: t.Object({ userId: t.String() }) },
  );
