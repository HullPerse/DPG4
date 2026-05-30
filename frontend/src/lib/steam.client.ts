import type { FamilyGame, GameData } from "@/types/games";

type SteamAppPayload = {
  id: number;
  name: string;
  image: string;
  capsuleImage: string;
  backgroundImage: string;
  websiteLink: string;
};

export function mapFamilyApps(apps: FamilyGame[]): GameData[] {
  return apps.map((g) => ({
    id: g.appid,
    name: g.name,
    image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${g.appid}/header.jpg`,
    capsuleImage: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${g.appid}/header.jpg`,
    backgroundImage: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${g.appid}/header.jpg`,
    verticalImage: `https://steamcdn-a.akamaihd.net/steam/apps/${g.appid}/library_600x900_2x.jpg`,
    steamLink: `https://store.steampowered.com/app/${g.appid}/`,
    websiteLink: "",
  })) as GameData[];
}

export function mapSteamAppPayload(data: SteamAppPayload) {
  return {
    game: {
      steam_app_id: data.id,
      name: data.name,
      header_image: data.image,
      capsule_image: data.capsuleImage,
      background: data.backgroundImage,
      website: data.websiteLink,
      vertical_image: `https://steamcdn-a.akamaihd.net/steam/apps/${data.id}/library_600x900_2x.jpg`,
    },
    library_image: data.capsuleImage,
    library_background: data.backgroundImage,
    library_vertical: `https://steamcdn-a.akamaihd.net/steam/apps/${data.id}/library_600x900_2x.jpg`,
  };
}
