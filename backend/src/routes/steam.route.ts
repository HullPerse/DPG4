import { Elysia, t } from "elysia";
import { config } from "../config";

function steamKey() {
  const key = config.steamApiKey;
  if (!key) throw new Error("STEAM_API_KEY is not configured on the server");
  return key;
}

function makeGameData(appid: number, name: string) {
  return {
    id: appid,
    name,
    image: `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/header.jpg`,
    capsuleImage: `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/library_600x900.jpg`,
    backgroundImage: `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/library_hero.jpg`,
    steamLink: `https://store.steampowered.com/app/${appid}/`,
    websiteLink: "",
    source: "owned",
  };
}

export const steamRoute = new Elysia({ prefix: "/steam" })
  .get(
    "/resolve-vanity",
    async ({ query, set }) => {
      try {
        const key = steamKey();
        const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${key}&vanityurl=${encodeURIComponent(query.vanityUrl)}`;
        const res = await fetch(url);
        const data = (await res.json()) as {
          response: { success: number; steamid?: string; message?: string };
        };
        if (data.response.success !== 1 || !data.response.steamid) {
          set.status = 404;
          return {
            error: data.response.message ?? "Vanity URL not found",
          };
        }
        return { steamId: data.response.steamid };
      } catch (e) {
        set.status = 502;
        return { error: e instanceof Error ? e.message : "Steam API error" };
      }
    },
    {
      query: t.Object({ vanityUrl: t.String() }),
      detail: { tags: ["steam"], summary: "Resolve Steam vanity URL" },
    },
  )
  .get(
    "/library/:steamId",
    async ({ params, set }) => {
      try {
        const key = steamKey();
        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${key}&include_played_free_games=1&include_appinfo=1&steamid=${params.steamId}`;
        const res = await fetch(url);
        const data = (await res.json()) as {
          response: { games?: { appid: number; name: string }[] };
        };
        const games = (data.response.games ?? []).map((g) =>
          makeGameData(g.appid, g.name),
        );
        return games;
      } catch (e) {
        set.status = 502;
        return { error: e instanceof Error ? e.message : "Steam API error" };
      }
    },
    { detail: { tags: ["steam"], summary: "Owned games library" } },
  )
  .get(
    "/family",
    async ({ query, set }) => {
      try {
        const url = `https://api.steampowered.com/IFamilyGroupsService/GetFamilyGroupForUser/v1/?access_token=${encodeURIComponent(query.accessToken)}&steamid=${encodeURIComponent(query.steamId)}`;
        const res = await fetch(url);
        const familyData = (await res.json()) as {
          response?: { family_groupid?: string };
        };
        const familyGroupId = familyData.response?.family_groupid;
        if (!familyGroupId) {
          set.status = 404;
          return { error: "No family group found" };
        }

        const appsUrl = `https://api.steampowered.com/IFamilyGroupsService/GetSharedLibraryApps/v1/?access_token=${encodeURIComponent(query.accessToken)}&family_groupid=${familyGroupId}&include_own=true&include_free=true`;
        const appsRes = await fetch(appsUrl);
        return await appsRes.json();
      } catch (e) {
        set.status = 502;
        return { error: e instanceof Error ? e.message : "Steam API error" };
      }
    },
    {
      query: t.Object({
        accessToken: t.String(),
        steamId: t.String(),
      }),
      detail: { tags: ["steam"], summary: "Family shared library" },
    },
  )
  .get(
    "/app/:appId",
    async ({ params, set }) => {
      try {
        const appId = params.appId.trim();
        const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
        const res = await fetch(url, {
          headers: { "Accept-Language": "en-US,en;q=0.9" },
        });
        const appDetails = (await res.json()) as Record<
          string,
          {
            success?: boolean;
            data?: {
              steam_appid?: number;
              appid?: number;
              name?: string;
              header_image?: string;
              capsule_image?: string;
              capsule_imagev5?: string;
              background?: string;
              website?: string;
            };
          }
        >;

        const entry = appDetails[appId];
        if (!entry?.success || !entry.data) {
          set.status = 404;
          return { error: "App not found or unavailable" };
        }

        const data = entry.data;
        const steamAppId =
          data.steam_appid ?? data.appid ?? Number(appId) ?? 0;
        const name = data.name ?? "";
        const headerImage = data.header_image ?? "";
        const capsuleImage =
          data.capsule_image ??
          data.capsule_imagev5 ??
          `https://steamcdn-a.akamaihd.net/steam/apps/${steamAppId}/library_600x900.jpg`;
        const backgroundImage =
          data.background ??
          `https://steamcdn-a.akamaihd.net/steam/apps/${steamAppId}/library_hero.jpg`;

        return {
          id: steamAppId,
          name,
          image: headerImage,
          capsuleImage,
          backgroundImage,
          steamLink: `https://store.steampowered.com/app/${steamAppId}/`,
          websiteLink: data.website ?? "",
          source: "owned",
        };
      } catch (e) {
        set.status = 502;
        return { error: e instanceof Error ? e.message : "Steam API error" };
      }
    },
    { detail: { tags: ["steam"], summary: "Steam store app details" } },
  );
