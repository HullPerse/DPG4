import { Elysia, t } from "elysia";
import { eq, desc, sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { parseFileInput } from "../lib/files";
import { compressWebp, isImageMime } from "../lib/images";
import { withRecordMeta } from "../lib/record";
import { serializeRow } from "../lib/serialize";
import { broadcast } from "../lib/ws";
import { createActivity } from "../services/activity.service";
import { changeUserStatus, getUserById, scoreUser } from "../services/user.service";
import { dbPlugin } from "../plugins/db.plugin";

const STATUSES: Record<string, string> = {
  PLAYING: "В ПРОЦЕССЕ",
  COMPLETED: "ПРОЙДЕНО",
  DROPPED: "ДРОПНУТО",
  REROLLED: "РЕРОЛЬНУТО",
};

const SUBSCRIPTION_CONTINUE = 1;

const optionalFile = t.Optional(t.Union([t.Null(), t.Any()]));

const gameCreateBody = t.Object({
  user: t.Any(),
  data: t.Any(),
  status: t.Optional(t.String()),
  playtime: t.Optional(t.Any()),
  score: t.Optional(t.Number()),
  review: t.Optional(t.Nullable(t.Any())),
  image: optionalFile,
});

const gamePatchBody = t.Object({
  user: t.Optional(t.Any()),
  data: t.Optional(t.Any()),
  status: t.Optional(t.String()),
  playtime: t.Optional(t.Any()),
  score: t.Optional(t.Number()),
  review: t.Optional(t.Nullable(t.Any())),
  image: optionalFile,
});

const gameStatusBody = t.Object({
  status: t.String(),
  time: t.Number(),
  score: t.Number(),
});

const gameVoteBody = t.Object({
  userId: t.String(),
  score: t.Number(),
});

const presetCreateBody = t.Object({
  label: t.String(),
});

const presetPatchBody = t.Object({
  label: t.Optional(t.String()),
  games: t.Optional(t.Array(t.Any())),
});

function mapGame(row: typeof schema.games.$inferSelect) {
  return withRecordMeta(serializeRow(row, ["image"]), "games");
}

export const gamesRoute = new Elysia({ prefix: "/games" })
  .use(dbPlugin)
  .get("/", async ({ db, query }) => {
    const q = db
      .select()
      .from(schema.games)
      .orderBy(desc(schema.games.created));
    const rows = await (query.userId
      ? q.where(sql`json_extract(${schema.games.user}, '$.id') = ${query.userId}`)
      : q);
    return rows.map(mapGame);
  })
  .get("/:id", async ({ params, db, set }) => {
    const [row] = await db
      .select()
      .from(schema.games)
      .where(eq(schema.games.id, params.id));
    if (!row) {
      set.status = 404;
      return { error: "Not found" };
    }
    return mapGame(row);
  })
  .post(
    "/",
    async ({ body, db }) => {
      const id = newId();
      const ts = nowIso();
      let imageFile = parseFileInput(body.image);
      if (imageFile && isImageMime(imageFile.mime)) {
        imageFile = {
          data: await compressWebp(imageFile.data),
          mime: "image/webp",
        };
      }

      const user = body.user as { id: string; username: string };
      const data = body.data as { name: string; capsuleImage?: string };

      await db.insert(schema.games).values({
        id,
        user: body.user,
        data: body.data,
        status: body.status ?? "PLAYING",
        playtime: body.playtime ?? {},
        score: body.score ?? 0,
        review: body.review ?? null,
        image: imageFile?.data ?? null,
        imageMime: imageFile?.mime ?? null,
        created: ts,
        updated: ts,
      });

      await createActivity(db, {
        author: user.id,
        image: data.capsuleImage ?? "",
        type: "image",
        text: `${user.username} добавил игру ${data.name}`,
      });

      broadcast("games", "create", id);
      return mapGame(
        (await db.select().from(schema.games).where(eq(schema.games.id, id)))[0]!,
      );
    },
    { body: gameCreateBody },
  )
  .patch(
    "/:id",
    async ({ params, body, db }) => {
      let imageFile = parseFileInput(body.image);
      if (imageFile && isImageMime(imageFile.mime)) {
        imageFile = {
          data: await compressWebp(imageFile.data),
          mime: "image/webp",
        };
      }
      const patch: Partial<typeof schema.games.$inferInsert> = {
        updated: nowIso(),
      };
      if (body.user !== undefined) patch.user = body.user;
      if (body.data !== undefined) patch.data = body.data;
      if (body.status !== undefined) patch.status = body.status;
      if (body.playtime !== undefined) patch.playtime = body.playtime;
      if (body.score !== undefined) patch.score = body.score;
      if (body.review !== undefined) patch.review = body.review;
      if (imageFile !== undefined) {
        patch.image = imageFile?.data ?? null;
        patch.imageMime = imageFile?.mime ?? null;
      }

      await db.update(schema.games).set(patch).where(eq(schema.games.id, params.id));
      broadcast("games", "update", params.id);
      const [row] = await db
        .select()
        .from(schema.games)
        .where(eq(schema.games.id, params.id));
      return mapGame(row!);
    },
    { body: gamePatchBody },
  )
  .post(
    "/:id/status",
    async ({ params, body, db }) => {
      const [game] = await db
        .select()
        .from(schema.games)
        .where(eq(schema.games.id, params.id));
      if (!game) return { error: "Not found" };

      const gameUser = game.user as { id: string; username: string };
      const gameData = game.data as { name: string; capsuleImage?: string };
      const newTime =
        body.status === "COMPLETED"
          ? { ...(game.playtime as object), user: body.time }
          : game.playtime;

      await createActivity(db, {
        author: gameUser.id,
        image: gameData.capsuleImage ?? "",
        type: "image",
        text: `${gameUser.username} сменил статус игры ${gameData.name} на ${STATUSES[body.status] ?? body.status}`,
      });

      const currentUser = await getUserById(db, gameUser.id);
      if (
        currentUser &&
        Array.isArray(currentUser.status) &&
        currentUser.status.includes("subscribed")
      ) {
        if (currentUser.money >= SUBSCRIPTION_CONTINUE) {
          await scoreUser(db, gameUser.id, -SUBSCRIPTION_CONTINUE);
        } else {
          await createActivity(db, {
            author: currentUser.id,
            image: currentUser.avatar,
            text: `${currentUser.username} не хватило денег на подписку`,
          });
          await changeUserStatus(db, gameUser.id, "subscribed", "remove");
          broadcast("ads", "update");
        }
      }

      if (body.status === "COMPLETED" && currentUser?.status?.includes("Борщ")) {
        const finalScore = Math.floor(body.time / 2);
        await scoreUser(db, gameUser.id, finalScore);
        await changeUserStatus(db, gameUser.id, "Борщ", "remove");
      }

      await db
        .update(schema.games)
        .set({
          status: body.status,
          playtime: newTime,
          score: body.score,
          updated: nowIso(),
        })
        .where(eq(schema.games.id, params.id));

      broadcast("games", "update", params.id);
      return mapGame(
        (await db.select().from(schema.games).where(eq(schema.games.id, params.id)))[0]!,
      );
    },
    { body: gameStatusBody },
  )
  .post(
    "/:id/vote",
    async ({ params, body, db }) => {
      const [game] = await db
        .select()
        .from(schema.games)
        .where(eq(schema.games.id, params.id));
      if (!game) return { error: "Not found" };

      const review = (game.review as {
        rating: number;
        comment: string;
        votes?: { user: string; score: number }[];
      }) ?? { rating: 0, comment: "", votes: [] };

      const existing = review.votes?.find((v) => v.user === body.userId);
      let votes = review.votes ?? [];

      if (!existing) {
        votes = [...votes, { user: body.userId, score: body.score }];
      } else {
        const oldScore = existing.score;
        votes = votes.filter((v) => v.user !== body.userId);
        votes.push({
          user: body.userId,
          score: oldScore === 0 || body.score !== oldScore ? body.score : 0,
        });
      }

      await db
        .update(schema.games)
        .set({
          review: { ...review, votes },
          updated: nowIso(),
        })
        .where(eq(schema.games.id, params.id));

      broadcast("games", "update", params.id);
      return { ok: true };
    },
    { body: gameVoteBody },
  )
  .delete("/:id", async ({ params, db }) => {
    await db.delete(schema.games).where(eq(schema.games.id, params.id));
    broadcast("games", "delete", params.id);
    return { ok: true };
  });

export const presetsRoute = new Elysia({ prefix: "/presets" })
  .use(dbPlugin)
  .get("/", async ({ db }) => {
    const rows = await db.select().from(schema.presets);
    return rows.map((r) => withRecordMeta(r, "presets"));
  })
  .get("/:id", async ({ params, db, set }) => {
    const [row] = await db
      .select()
      .from(schema.presets)
      .where(eq(schema.presets.id, params.id));
    if (!row) {
      set.status = 404;
      return { error: "Not found" };
    }
    return withRecordMeta(row, "presets");
  })
  .post(
    "/",
    async ({ body, db }) => {
      const id = newId();
      const ts = nowIso();
      await db.insert(schema.presets).values({
        id,
        label: body.label,
        games: [],
        created: ts,
        updated: ts,
      });
      broadcast("presets", "create", id);
      return withRecordMeta(
        { id, label: body.label, games: [], created: ts, updated: ts },
        "presets",
      );
    },
    { body: presetCreateBody },
  )
  .patch(
    "/:id",
    async ({ params, body, db }) => {
      const patch: Partial<typeof schema.presets.$inferInsert> = {
        updated: nowIso(),
      };
      if (body.label !== undefined) patch.label = body.label;
      if (body.games !== undefined) patch.games = body.games;

      await db
        .update(schema.presets)
        .set(patch)
        .where(eq(schema.presets.id, params.id));
      broadcast("presets", "update", params.id);
      const [row] = await db
        .select()
        .from(schema.presets)
        .where(eq(schema.presets.id, params.id));
      return withRecordMeta(row!, "presets");
    },
    { body: presetPatchBody },
  )
  .delete("/:id", async ({ params, db }) => {
    await db.delete(schema.presets).where(eq(schema.presets.id, params.id));
    broadcast("presets", "delete", params.id);
    return { ok: true };
  });
