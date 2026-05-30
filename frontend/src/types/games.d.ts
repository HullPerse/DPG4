import { User } from "./user";
import { RecordMeta } from "./record";

export interface Preset extends RecordMeta {
  label: string;
  games: GameData[];
}

export interface Game extends RecordMeta {
  user: {
    id: string;
    username: string;
  };
  data: GameData;
  score?: number;
  playtime: {
    hltb: number;
    user?: number;
  };
  status: GameStatus;
  review?: GameReview;
  image?: File;
  hasImage?: boolean;
}

export type GameData = {
  id: number;
  name: string;
  image: string;
  capsuleImage: string;
  backgroundImage: string;
  verticalImage?: string;
  steamLink: string;
  websiteLink: string;
  time?: number;
  source?: "owned" | "shared";
};
export type GameStatus = "PLAYING" | "COMPLETED" | "DROPPED" | "REROLLED";
export type ReviewRating = {
  user: string;
  score: number;
};
export type GameReview = {
  rating: number;
  comment: string;
  votes?: ReviewRating[];
};

export type FamilyGame = {
  app_type: number;
  appid: number;
  capsule_filename: string;
  name: string;
};
