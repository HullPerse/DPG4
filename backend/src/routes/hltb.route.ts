import { Elysia, t } from "elysia";
import { cacheGet, cacheSet } from "@/lib/cache.utils";

export default new Elysia({ prefix: "/hltb" }).get(
  "/search",
  async ({ query, set }) => {
    const term = query.q?.trim();
    if (!term) return { results: [] };

    const cacheKey = `hltb:search:${term.toLowerCase()}`;
    const cached = await cacheGet<{ title: string; mainStory: number }[]>(cacheKey);
    if (cached) return { results: cached };

    try {
      const res = await fetch("https://howlongtobeat.com/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://howlongtobeat.com/",
        },
        body: JSON.stringify({
          searchType: "games",
          searchTerms: term.split(/\s+/),
          searchPage: 1,
          size: 5,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        set.status = 502;
        return { results: [] };
      }

      const data = (await res.json()) as {
        data?: { game_name: string; gameplayMain: number }[];
      };

      const results = (data.data ?? []).map((g) => ({
        title: g.game_name,
        mainStory: Math.round(g.gameplayMain * 10) / 10,
      }));

      await cacheSet(cacheKey, results, 24 * 60 * 60 * 1000);
      return { results };
    } catch {
      set.status = 502;
      return { results: [] };
    }
  },
  {
    query: t.Object({ q: t.String() }),
  },
);
