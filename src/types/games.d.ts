import { User } from "./user";

export interface Preset {
  id: string;
  label: string;
  games: any[];
}

export interface Game {
  id: string;
  user: {
    id: string;
    usernname: string;
  };
  data: GameData;
  score: number;
  playtime: {
    hltb: number;
    user: number;
  };
  status: GameStatus;
  review: GameReview;
  image?: File;
}

export type GameData = {
  id: number;
  name: string;
  image: string;
  backgroundImage: string;
  steamLink: string;
  websiteLink: string;
};
export type GameStatus = "PLAYING" | "COMPLETED" | "DROPPED" | "REROLLED";
export type GameReview = {
  rating: number;
  comment: string;
};
