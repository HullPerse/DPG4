import { Preset, Game, GameReview } from "@/types/games";
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

  getGameInfo = async (id: string): Promise<Game> => {
    return await this.gamesCollection.getOne(id);
  };

  addGame = async (game: Game): Promise<Game> => {
    return await this.gamesCollection.create(game);
  };

  deleteGame = async (id: string) => {
    return await this.gamesCollection.delete(id);
  };

  //reviews
  voteReview = async (id: string, userId: string, vote: -1 | 1) => {
    const review = await this.getVotes(id);
    if (!review) return;

    //check if any votes exists
    // if no then just create a new array with only current user vote
    // if exists then check if current user has a vote there
    // if no then create a new object for current user vote
    // if yes then update the vote
    const existingVote = review.votes
      ? review.votes.find((vote) => vote.userId === userId)
      : false;

    const reviewData = {
      rating: review.rating,
      comment: review.comment,
      votes: existingVote
        ? review.votes.map((v) => (v.userId === userId ? { userId, vote } : v))
        : [{ userId, vote }],
    };

    await this.gamesCollection.update(id, { review: reviewData });
  };

  getVotes = async (id: string): Promise<GameReview> => {
    return await this.gamesCollection
      .getOne(id, {
        fields: "review",
      })
      .then((res) => res.review as GameReview);
  };

  //presets
  getPresets = async (): Promise<Preset[]> => {
    return await this.presetsCollection.getFullList();
  };
}
