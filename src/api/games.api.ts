import { Preset, Game, GameReview, GameStatus } from "@/types/games";
import { client } from "./client.api";

import { User } from "@/types/user";

export default class GameApi {
  private readonly gamesCollection = client.collection("games");
  private readonly presetsCollection = client.collection("presets");

  //steam api
  getSteamGame = async (appId: string) => {
    const id = appId.trim();

    if (!id) return;

    const targetURL =
      "https://corsproxy.io/" +
      `https://store.steampowered.com/api/appdetails?appids=${id}`;

    try {
      const res = await fetch(targetURL, {});
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

  saveReview = async (id: string, review: GameReview, image?: File | null) => {
    const currentGame = await this.gamesCollection.getOne(id, {
      fields: "review",
    });
    const currentReview = (currentGame.review as GameReview) || {
      rating: 0,
      comment: "",
      votes: [],
    };

    return await this.gamesCollection.update(id, {
      review: {
        rating: review.rating,
        comment: review.comment,
        votes: currentReview.votes ?? [],
      },
      image,
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

  addGame = async (game: Game): Promise<Game> => {
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
