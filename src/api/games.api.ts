import { invoke } from "@tauri-apps/api/core";
import { Preset, Game, GameReview, GameStatus, GameData } from "@/types/games";
import { client } from "./client.api";

import ItemsApi from "./items.api";
const itemsApi = new ItemsApi();

import { User } from "@/types/user";
import { Activity } from "@/types/activity";

const STATUSES = [
  {
    name: "PLAYING",
    label: "В ПРОЦЕССЕ",
  },
  {
    name: "COMPLETED",
    label: "ПРОЙДЕНО",
  },
  {
    name: "DROPPED",
    label: "ДРОПНУТО",
  },
  {
    name: "REROLLED",
    label: "РЕРОЛЬНУТО",
  },
];

export default class GameApi {
  private readonly gamesCollection = client.collection("games");
  private readonly presetsCollection = client.collection("presets");
  private readonly userCollection = client.collection("users");
  private readonly activityCollection = client.collection("activity");

  //steam api
  resolveVanityUrl = async (username: string): Promise<string> => {
    const response = await invoke<string>("resolve_vanity_url", {
      vanityUrl: username,
    });
    return response;
  };

  getSteamLibrary = async (steamId: string): Promise<GameData[]> => {
    const response = await invoke<string>("get_steam_library", { steamId });

    return JSON.parse(response);
  };

  getSteamGame = async (appId: string) => {
    const id = appId.trim();

    if (!id) return;

    try {
      const result = await invoke<string>("get_steam_game", { appId: id });
      const data = JSON.parse(result);

      return {
        game: {
          steam_app_id: data.id,
          name: data.name,
          header_image: data.image,
          capsule_image: data.capsuleImage,
          background: data.backgroundImage,
          website: data.websiteLink,
        },
        library_image: data.capsuleImage,
        library_background: data.backgroundImage,
      };
    } catch (e) {
      return console.error(e);
    }
  };

  //games
  getGames = async (userId: string): Promise<Game[]> => {
    return await this.gamesCollection.getFullList({
      fields: "id, data.name, status, data.capsuleImage",
      filter: `user.id = "${userId}"`,
    });
  };

  getAllGames = async (): Promise<Game[]> => {
    return await this.gamesCollection.getFullList();
  };

  getLastGame = async (userId: string[]) => {
    let lastGamePerPlayer: Game[] = [];

    for (const id of userId) {
      const games = await this.getAllUserGames(id);

      if (games.length > 0) lastGamePerPlayer.push(games[games.length - 1]);
    }

    return lastGamePerPlayer;
  };

  getAllUserGames = async (userId: string): Promise<Game[]> => {
    return await this.gamesCollection.getFullList({
      filter: `user.id = "${userId}"`,
    });
  };

  getGameInfo = async (id: string): Promise<Game> => {
    return await this.gamesCollection.getOne(id);
  };

  getReview = async (
    id: string,
  ): Promise<{
    id: string;
    user: User;
    review: GameReview;
    image: File;
    data: { name: string };
  }> => {
    return await this.gamesCollection.getOne(id, {
      fields: "id, user.id, review, image, data.name",
    });
  };

  saveReview = async (
    userId: string,
    id: string,
    review: GameReview,
    image?: File | null,
  ) => {
    const currentGame = await this.gamesCollection.getOne(id, {
      fields: "review",
    });

    const inventory = await itemsApi.getInventory(userId);
    const hasPoopReview = inventory.find((i) => i.label === "Хуишка");

    const currentReview = (currentGame.review as GameReview) || {
      rating: 0,
      comment: "",
      votes: [],
    };

    return await this.gamesCollection
      .update(id, {
        review: {
          rating: review.rating,
          comment: hasPoopReview ? `💩 ${review.comment} 💩` : review.comment,
          votes: currentReview.votes ?? [],
        },
        image,
      })
      .then(async () => {
        if (hasPoopReview) {
          await itemsApi.chargeInventory(
            String(hasPoopReview.id),
            hasPoopReview.charge,
            -1,
          );
        }
      });
  };

  voteReview = async (
    gameId: string,
    user: { id: string; username: string },
    score: number,
  ) => {
    const allReviews = (
      await this.gamesCollection
        .getOne(gameId, { fields: "review" })
        .then((game) => game)
    ).review as GameReview;

    const existingVote = allReviews.votes?.find(
      (item) => item.user === user.id,
    );

    //if no votes for user
    if (!existingVote || !allReviews.votes) {
      const voteData = {
        user: user.id,
        score: score,
      };

      return await this.gamesCollection.update(gameId, {
        review: {
          rating: allReviews.rating,
          comment: allReviews.comment,
          votes: [...(allReviews.votes ?? []), voteData],
        },
      });
    }

    //if user has already voted, update their vote
    const oldScore = allReviews.votes.find(
      (item) => item.user === user.id,
    )?.score;

    const newVotes = allReviews.votes.filter((item) => item.user !== user.id);
    const voteData = {
      user: user.id,
      score: oldScore === 0 || score !== oldScore ? score : 0,
    };

    //update the review with the new vote
    return await this.gamesCollection.update(gameId, {
      review: {
        rating: allReviews.rating,
        comment: allReviews.comment,
        votes: [...newVotes, voteData],
      },
    });
  };

  getAllReviews = async (
    userId: string,
  ): Promise<{ user: User | null; games: Game[] }> => {
    const allGames = await this.getAllUserGames(userId);
    if (!allGames) return { user: null, games: [] };

    const user = (await this.userCollection.getOne(userId)) as User;

    return {
      user: user,
      games: allGames.filter((game) => game.review || game.image),
    };
  };

  addGame = async (game: Game): Promise<Game> => {
    const activityData = {
      author: game.user.id,
      image: game.data.capsuleImage,
      type: "image",
      text: `${game.user.username} добавил игру ${game.data.name}`,
    } as Activity;

    await this.activityCollection.create(activityData);

    return await this.gamesCollection.create(game);
  };

  updateGame = async (game: Game): Promise<Game> => {
    if (!game.id) throw new Error("Game ID is required for update");

    return await this.gamesCollection.update(game.id, game);
  };

  changeStatus = async (
    id: string,
    game: Game,
    status: GameStatus,
    time: number,
    score: number,
  ) => {
    const newTime =
      status === "COMPLETED" ? { ...game.playtime, user: time } : game.playtime;

    const activityData = {
      author: game.user.id,
      image: game.data.capsuleImage,
      type: "image",
      text: `${game.user.username} сменил статус игры ${game.data.name} на ${STATUSES.find((s) => s.name === status)?.label}`,
    } as Activity;

    await this.activityCollection.create(activityData);

    return await this.gamesCollection.update(id, {
      status: status,
      playtime: newTime,
      score: score,
    });
  };

  removeGame = async (id: string): Promise<void> => {
    await this.gamesCollection.delete(id);
  };

  //presets
  getPresets = async (): Promise<Preset[]> => {
    return await this.presetsCollection.getFullList();
  };

  getPresetById = async (id: string): Promise<Preset> => {
    return await this.presetsCollection.getOne(id);
  };

  addPreset = async (label: string) => {
    return await this.presetsCollection.create({
      label: label,
    });
  };

  removePreset = async (id: string) => {
    return await this.presetsCollection.delete(id);
  };

  addPresetGame = async (id: string, game: Game): Promise<Preset> => {
    const preset = (await this.presetsCollection.getOne(id)) as Preset;

    const newGames = [...(preset.games ?? []), game.data];

    return await this.presetsCollection.update(id, {
      games: newGames,
    });
  };

  removePresetGame = async (
    presetId: string,
    gameId: number,
  ): Promise<Preset> => {
    const preset = (await this.presetsCollection.getOne(presetId)) as Preset;

    const filteredGames = preset.games.filter((game) => game.id !== gameId);

    return await this.presetsCollection.update(presetId, {
      games: filteredGames,
    });
  };
}
