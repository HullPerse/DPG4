import { Elysia, t } from "elysia";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import * as schema from "../db/schema";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { parseFileInput } from "../lib/files";
import { compressWebp, isImageMime } from "../lib/images";
import { withRecordMeta } from "../lib/record";
import { serializeRow } from "../lib/serialize";
import { broadcast } from "../lib/ws";
import { logger } from "../lib/logger";
import { dbPlugin } from "../plugins/db.plugin";
import { servicesPlugin } from "../services.server";
import {
  GAME_STATUS_LABELS,
  SUBSCRIPTION_CONTINUE_COST,
  STATUS_EFFECTS,
} from "../lib/constants";

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


function mapGame(row: typeof schema.games.$inferSelect) {
  return withRecordMeta(serializeRow(row, ["image"]), "games");
}

export const gamesRoute = new Elysia({ prefix: "/games" })
  .use(dbPlugin)
  .use(servicesPlugin)
  .get(
    "/",
    async ({ db, query }) => {
      const limit = query.limit ? Math.min(Number(query.limit), 500) : 100;
      const offset = query.offset ? Number(query.offset) : 0;
      const conditions: SQL[] = [];

      if (query.userId) {
        conditions.push(eq(schema.games.userId, query.userId));
      }

      if (query.status) {
        conditions.push(eq(schema.games.status, query.status));
      }

      if (query.hasReview === "true") {
        conditions.push(sql`${schema.games.review} IS NOT NULL`);
      }

      if (query.search) {
        conditions.push(
          sql`json_extract(${schema.games.data}, '$.name') LIKE ${'%' + query.search + '%'}`,
        );
      }

      const q = conditions.length > 0
        ? db.select().from(schema.games).where(and(...conditions))
        : db.select().from(schema.games);

      const rows = await q.orderBy(desc(schema.games.created)).limit(limit).offset(offset);
      return rows.map(mapGame);
    },
    {
      query: t.Optional(
        t.Object({
          userId: t.Optional(t.String()),
          search: t.Optional(t.String()),
          status: t.Optional(t.String()),
          hasReview: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          offset: t.Optional(t.String()),
        }),
      ),
    },
  )
  .get(
    "/:id",
    async ({ params, db, set }) => {
      const [row] = await db
        .select()
        .from(schema.games)
        .where(eq(schema.games.id, params.id));
      if (!row) {
        set.status = 404;
        return { error: "Not found" };
      }
      return mapGame(row);
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/",
    async ({ body, db, activityService }) => {
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

      const row = {
        id,
        userId: user?.id ?? null,
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
      };

      await db.insert(schema.games).values(row);

      await activityService.create({
        author: user.id,
        image: data.capsuleImage ?? "",
        type: "image",
        text: `${user.username} добавил игру ${data.name}`,
      });

      broadcast("games", "create", id);
      logger.info(user.username, "added game", data.name);
      return mapGame(row as typeof schema.games.$inferSelect);
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

      await db
        .update(schema.games)
        .set(patch)
        .where(eq(schema.games.id, params.id));
      broadcast("games", "update", params.id);
      const [row] = await db
        .select()
        .from(schema.games)
        .where(eq(schema.games.id, params.id));
      const gameUser = row?.user as { username?: string } | undefined;
      const gameData = row?.data as { name?: string } | undefined;
      logger.info(
        gameUser?.username ?? null,
        "updated game",
        gameData?.name ?? params.id,
      );
      return mapGame(row!);
    },
    { body: gamePatchBody },
  )
  .post(
    "/:id/status",
    async ({ params, body, db, activityService, userService }) => {
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

      await activityService.create({
        author: gameUser.id,
        image: gameData.capsuleImage ?? "",
        type: "image",
        text: `${gameUser.username} сменил статус игры ${gameData.name} на ${GAME_STATUS_LABELS[body.status] ?? body.status}`,
      });

      const currentUser = await userService.getById(gameUser.id);
      if (
        currentUser &&
        Array.isArray(currentUser.status) &&
        currentUser.status.includes(STATUS_EFFECTS.SUBSCRIBED)
      ) {
        if (currentUser.money >= SUBSCRIPTION_CONTINUE_COST) {
          await userService.score(gameUser.id, -SUBSCRIPTION_CONTINUE_COST);
        } else {
          await activityService.create({
            author: currentUser.id,
            image: currentUser.avatar,
            text: `${currentUser.username} не хватило денег на подписку`,
          });
          await userService.changeStatus(gameUser.id, STATUS_EFFECTS.SUBSCRIBED, "remove");
          broadcast("ads", "update");
        }
      }

      if (
        body.status === "COMPLETED" &&
        currentUser?.status?.includes(STATUS_EFFECTS.BORSCH)
      ) {
        const finalScore = Math.floor(body.time / 2);
        await userService.score(gameUser.id, finalScore);
        await userService.changeStatus(gameUser.id, STATUS_EFFECTS.BORSCH, "remove");
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
      logger.info(
        gameUser.username,
        "changed game status",
        gameData.name,
        GAME_STATUS_LABELS[body.status] ?? body.status,
      );
      return mapGame(
        (
          await db
            .select()
            .from(schema.games)
            .where(eq(schema.games.id, params.id))
        )[0]!,
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
      logger.info(null, "voted on game", params.id, `user:${body.userId}`);
      return { ok: true };
    },
    { body: gameVoteBody },
  )
  .delete(
    "/:id",
    async ({ params, db }) => {
      await db.delete(schema.games).where(eq(schema.games.id, params.id));
      broadcast("games", "delete", params.id);
      logger.info(null, "deleted game", params.id);
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) },
  );


