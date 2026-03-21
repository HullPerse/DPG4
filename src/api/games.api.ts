import { Preset, Game, GameReview } from "@/types/games";
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
  }> => {
    return await this.gamesCollection.getOne(id, {
      fields: "id, user.id, review, image",
    });
  };

  voteReview = async (
    gameId: string,
    user: { id: string; username: string },
    score: number,
  ) => {
    const allReviews = (await this.gamesCollection
      .getOne(gameId, { fields: "review" })
      .then((game) => game)).review as GameReview;


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

  removeGame = async (id: string): Promise<void> => {
    await this.gamesCollection.delete(id);
  };

  //presets
  getPresets = async (): Promise<Preset[]> => {
    return await this.presetsCollection.getFullList();
  };
}
