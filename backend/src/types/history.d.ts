export interface StatsRow {
  date: string;
  net: number;
  gamesPlayed: number;
}

export interface GameDistRow {
  type: string;
  count: number;
  totalNet: number;
}

export interface BetDistRow {
  range: string;
  count: number;
}

export interface LeaderboardRow {
  userId: string;
  username: string;
  avatar: string;
  color: string;
  currentMoney: number;
  currentTickets: number;
  totalNet: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  biggestWin: number;
}
