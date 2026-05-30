import { Elysia, t } from "elysia";
import { HowLongToBeatService } from "howlongtobeat";

const hltb = new HowLongToBeatService();

export const metadataRoute = new Elysia({ prefix: "/metadata" })
  .get(
    "/hltb",
    async ({ query, set }) => {
      const title = query.title?.trim();
      if (!title) {
        set.status = 400;
        return { error: "title is required" };
      }

      try {
        const results = await hltb.search(title);
        const best = results[0];
        if (!best) {
          return { title, hours: null, gameId: null };
        }
        const hours = Math.round(best.gameplayMain);
        return {
          title: best.name,
          hours: hours > 0 ? hours : null,
          gameId: best.id,
          imageUrl: best.imageUrl,
        };
      } catch (e) {
        set.status = 502;
        return { error: e instanceof Error ? e.message : "HLTB lookup failed" };
      }
    },
    {
      query: t.Object({ title: t.String() }),
      detail: { tags: ["metadata"], summary: "HLTB average playtime (proxy)" },
    },
  );
