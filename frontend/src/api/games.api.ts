import { Preset, Game, GameReview, GameStatus, GameData, FamilyGame } from "@/types/games";
import { apiFetch } from "./client.api";
import ItemsApi from "./items.api";
import { User } from "@/types/user";
import { filePayload } from "@/lib/fileBlob";
import { mapFamilyApps, mapSteamAppPayload } from "@/lib/steam.client";

const itemsApi = new ItemsApi();

export default class GameApi {
  resolveVanityUrl = async (username: string): Promise<string> => {
    const res = await apiFetch<{ steamId: string }>(
      `/steam/resolve-vanity?vanityUrl=${encodeURIComponent(username)}`,
    );
    return res.steamId;
  };

  getSteamLibrary = async (steamId: string): Promise<GameData[]> => {
    const data = await apiFetch<GameData[]>(`/steam/library/${steamId}`);
    return data.map((g) => ({ ...g, id: String(g.id) }));
  };

  getSteamFamily = async (steamId: string, accessToken: string): Promise<GameData[]> => {
    const data = await apiFetch<{ response: { apps: FamilyGame[] } }>(
      `/steam/family?accessToken=${encodeURIComponent(accessToken)}&steamId=${encodeURIComponent(steamId)}`,
    );
    return mapFamilyApps(data.response?.apps ?? []);
  };

  searchSteam = async (term: string) => {
    try {
      return await apiFetch<{ appid: number; name: string; image: string }[]>(
        `/steam/search/${encodeURIComponent(term)}`,
      );
    } catch {
      return [];
    }
  };

  getSteamAchievements = async (appId: string, steamId: string) => {
    try {
      return await apiFetch<{
        gameName: string;
        achievements: {
          apiname: string;
          achieved: number;
          unlocktime: number;
          name: string;
          description: string;
          icon: string;
        }[];
      }>(`/steam/achievements/${appId}/${steamId}`);
    } catch {
      return null;
    }
  };

  getSteamGame = async (appId: string) => {
    const id = appId.trim();
    if (!id) return;

    try {
      const data = await apiFetch<{
        id: number;
        name: string;
        image: string;
        capsuleImage: string;
        backgroundImage: string;
        websiteLink: string;
      }>(`/steam/app/${id}`);
      return mapSteamAppPayload(data);
    } catch (e) {
      console.error(e);
      return undefined;
    }
  };

  coerceGameData = (g: Game): Game => ({
    ...g,
    data: { ...g.data, id: String(g.data.id) },
  });

  getGames = async (userId: string): Promise<Game[]> => {
    const all = await apiFetch<Game[]>(`/games?userId=${userId}`);
    return all.map(this.coerceGameData);
  };

  getAllGames = async (): Promise<Game[]> => {
    const data = await apiFetch<Game[]>("/games");
    return data.map(this.coerceGameData);
  };

  getGamesFiltered = async (params?: {
    userId?: string;
    search?: string;
    status?: string;
    hasReview?: boolean;
    limit?: number;
  }): Promise<Game[]> => {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.set("userId", params.userId);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.hasReview) searchParams.set("hasReview", "true");
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    const data = await apiFetch<Game[]>(`/games${qs ? `?${qs}` : ""}`);
    return data.map(this.coerceGameData);
  };

  getLastGame = async (userId: string[]) => {
    const lastGamePerPlayer: Game[] = [];
    for (const id of userId) {
      const games = await this.getGamesFiltered({ userId: id, limit: 1 });
      if (games.length > 0) lastGamePerPlayer.push(this.coerceGameData(games[games.length - 1]!));
    }
    return lastGamePerPlayer;
  };

  getCompletedGames = async (userId: string) => {
    const games = await this.getGames(userId);
    if (!games) return [];
    else return games.filter((g) => g.status === "COMPLETED") ?? [];
  };

  getAllUserGames = async (userId: string): Promise<Game[]> => {
    const data = await apiFetch<Game[]>(`/games?userId=${userId}`);
    return data.map(this.coerceGameData);
  };

  getGameInfo = async (id: string): Promise<Game> => {
    const data = await apiFetch<Game>(`/games/${id}`);
    return this.coerceGameData(data);
  };

  getReview = async (id: string): Promise<Game> => {
    const data = await apiFetch<Game>(`/games/${id}`);
    return this.coerceGameData(data);
  };

  saveReview = async (userId: string, id: string, review: GameReview, image?: File | null) => {
    const currentGame = await apiFetch<Game>(`/games/${id}`);
    const inventory = await itemsApi.getInventory(userId);
    const hasPoopReview = inventory.find((i) => i.label === "Хуишка");
    const currentReview = (currentGame.review as GameReview) || {
      rating: 0,
      comment: "",
      votes: [],
    };

    const imagePayload = image instanceof File ? await filePayload(image) : undefined;

    await apiFetch(`/games/${id}`, {
      method: "PATCH",
      body: {
        review: {
          rating: review.rating,
          comment: hasPoopReview ? `💩 ${review.comment} 💩` : review.comment,
          votes: currentReview.votes ?? [],
        },
        image: imagePayload,
      },
    });

    if (hasPoopReview) {
      await itemsApi.chargeInventory(String(hasPoopReview.id), hasPoopReview.charge, -1);
    }
  };

  voteReview = async (gameId: string, user: { id: string; username: string }, score: number) => {
    return apiFetch(`/games/${gameId}/vote`, {
      method: "POST",
      body: { userId: user.id, score },
    });
  };

  getAllReviews = async (userId: string): Promise<{ user: User | null; games: Game[] }> => {
    const allGames = await this.getGamesFiltered({ userId, hasReview: true });
    const user = await apiFetch<User>(`/users/${userId}`);
    return { user, games: allGames };
  };

  addGame = async (game: Game): Promise<Game> =>
    apiFetch<Game>("/games", { method: "POST", body: game });

  updateGame = async (game: Game): Promise<Game> => {
    if (!game.id) throw new Error("Game ID is required for update");
    return apiFetch<Game>(`/games/${game.id}`, {
      method: "PATCH",
      body: game,
    });
  };

  changeStatus = async (
    id: string,
    _game: Game,
    status: GameStatus,
    time: number,
    score: number,
  ) => {
    return apiFetch(`/games/${id}/status`, {
      method: "POST",
      body: { status, time, score },
    });
  };

  removeGame = async (id: string): Promise<void> => {
    await apiFetch(`/games/${id}`, { method: "DELETE" });
  };

  coercePresetGames = (p: Preset): Preset => ({
    ...p,
    games: p.games.map((g) => ({ ...g, id: String(g.id) })),
  });

  getPresets = async (search?: string): Promise<Preset[]> => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    const data = await apiFetch<Preset[]>(`/presets${qs}`);
    return data.map(this.coercePresetGames);
  };

  getPresetById = async (id: string): Promise<Preset> => {
    const data = await apiFetch<Preset>(`/presets/${id}`);
    return this.coercePresetGames(data);
  };

  addPreset = async (label: string) => apiFetch("/presets", { method: "POST", body: { label } });

  removePreset = async (id: string) => apiFetch(`/presets/${id}`, { method: "DELETE" });

  addPresetGame = async (id: string, game: Game): Promise<Preset> => {
    const preset = await this.getPresetById(id);
    const newGames = [...(preset.games ?? []), game.data];
    return apiFetch<Preset>(`/presets/${id}`, {
      method: "PATCH",
      body: { games: newGames },
    });
  };

  removePresetGame = async (presetId: string, gameId: string): Promise<Preset> => {
    const preset = await this.getPresetById(presetId);
    const filteredGames = preset.games.filter((game) => game.id !== gameId);
    return apiFetch<Preset>(`/presets/${presetId}`, {
      method: "PATCH",
      body: { games: filteredGames },
    });
  };
}
