import { User } from "./user";

export interface Preset {
  id: string;
  label: string;
  games: GameData[];
}

export interface Game {
  id?: string;
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
  created?: string;
}

export type GameData = {
  id: number;
  name: string;
  image: string;
  capsuleImage: string;
  backgroundImage: string;
  steamLink: string;
  websiteLink: string;
  time?: number;
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

export interface SteamOwnedGamesResponse {
  response: {
    game_count: number;
    games: SteamOwnedGame[];
  };
}
export interface SteamOwnedGame {
  appid: number;
  name: string;
  img_icon_url: string;
  img_logo_url: string;
  playtime_forever: number;
}
export interface FamilyGroupResponse {
  family_groupid: string;
}
export interface SharedLibraryAppsResponse {
  apps: Array<{
    appid: number;
    name: string;
    playtime?: number;
  }>;
}
