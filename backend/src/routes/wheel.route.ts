import { Elysia, t } from "elysia";
import * as schema from "@/db/schema.db";
import { newId, nowIso } from "@/lib/index.utils";
import { SPIN_COST } from "@/lib/gambling.constants";
import { authPlugin, databasePlugin } from "@/plugins/index.plugin";
import servicesPlugin from "@/services.server";

const FREE_LIST_TYPES = new Set([
  "users",
  "items",
  "userItems",
  "userGames",
  "presets",
  "custom",
  "logical",
  "general",
  "itemWheel",
  "presetGame",
]);

const ALLOWED_LIST_TYPES = new Set(
  ...FREE_LIST_TYPES,
);
const SPIN_COOLDOWN_MS = 1_500;

const spinCooldowns = new Map<string, number>();

const WheelItemSchema = t.Object({
  id: t.String(),
  label: t.String(),
  image: t.String(),
  type: t.String(),
});

function secureRandomInt(max: number): number {
  const buf = new Uint32Array(1);
  const threshold = (0xffffffff - (0xffffffff % max));
  while (true) {
    crypto.getRandomValues(buf);
    if (buf[0] < threshold) return buf[0] % max;
  }
}

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickWinner(length: number): number {
  return secureRandomInt(length);
}

export default new Elysia({ prefix: "/wheel" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .use(authPlugin)
  .post(
    "/spin",
    async ({ body, user, set, db, userService }) => {
      const { items, free, listType } = body;

      if (!Array.isArray(items) || items.length === 0) {
        set.status = 400;
        return { error: "Items array is required" };
      }


      if (listType && !ALLOWED_LIST_TYPES.has(listType)) {
        set.status = 400;
        return { error: "Unknown list type" };
      }

      if (free && listType && !FREE_LIST_TYPES.has(listType)) {
        set.status = 400;
        return { error: "This pool does not support free spins" };
      }

      const now = Date.now();
      const lastSpin = spinCooldowns.get(user.sub);
      if (lastSpin && now - lastSpin < SPIN_COOLDOWN_MS) {
        set.status = 429;
        return { error: "Please wait before spinning again" };
      }

      const currentUser = await userService.getById(user.sub);

      if (!free) {
        if (!currentUser || currentUser.money < SPIN_COST) {
          set.status = 402;
          return { error: "Недостаточно чубриков" };
        }
        await userService.score(user.sub, -SPIN_COST);
      }

      spinCooldowns.set(user.sub, now);

      const shuffled = fisherYatesShuffle(items);
      const winnerIndex = pickWinner(shuffled.length);
      const winner = shuffled[winnerIndex];

      const id = newId();
      const ts = nowIso();

      try {
        await db.insert(schema.history).values({
          id,
          userId: user.sub,
          owner: currentUser
            ? { id: currentUser.id, username: currentUser.username }
            : null,
          type: "wheel",
          label: winner.label,
          image: winner.type === "image" ? winner.image : "",
          bid: free ? 0 : SPIN_COST,
          payout: 0,
          net: free ? 0 : -SPIN_COST,
          data: {
            itemId: winner.id,
            itemType: winner.type,
            listType: listType ?? "general",
            free,
          },
          created: ts,
        });
      } catch {
        spinCooldowns.delete(user.sub);
        if (!free && currentUser) {
          await userService.score(user.sub, SPIN_COST).catch(() => {});
        }
        set.status = 500;
        return { error: "Failed to record spin" };
      }

      return { shuffled, winnerIndex };
    },
    {
      body: t.Object({
        items: t.Array(WheelItemSchema),
        free: t.Boolean(),
        listType: t.Optional(t.String()),
      }),
      requireAuth: true,
    },
  );
