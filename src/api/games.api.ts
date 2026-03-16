import { Preset, Game } from "@/types/games";
import { client } from "./client.api";

export default class GameApi {
  private readonly gamesCollection = client.collection("games");
  private readonly presetsCollection = client.collection("presets");

  //steam api
  getSteamGame = async (appId: string) => {
    const id = appId.trim();

    if (!id) return;

    const targetURL =
      "https://cors-anywhere.com/" +
      `https://store.steampowered.com/api/appdetails?appids=${id}`;

    try {
      const res = await fetch(targetURL);
      if (!res.ok) return;

      const json = await res.json();
      const entry = json?.[id];

      if (!entry?.success || !entry?.data) return;

      return {
        game: entry.data,
        library_image: `https://steamcdn-a.akamaihd.net/steam/apps/${id}/library_600x900.jpg`,
        library_background: `https://steamcdn-a.akamaihd.net/steam/apps/${id}/library_hero.jpg`,
      };
    } catch (e) {
      return console.error(e);
    }
  };

  //games
  getGames = async (userId: string): Promise<Game[]> => {
    return await this.gamesCollection.getFullList({
      fields: "id, data.name, status",
      filter: `user.id = "${userId}"`,
    });
  };

  getGameInfo = async (id: string): Promise<Game[]> => {
    return await this.gamesCollection.getOne(id);
  };

  //presets
  getPresets = async (): Promise<Preset[]> => {
    return await this.presetsCollection.getFullList();
  };
}
