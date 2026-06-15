export type HistoryRecord = {
  id: string;
  userId: string;
  owner: { id: string; username: string } | null;
  type: "wheel" | "dice" | "blackjack" | "rocket" | "pachinko" | "mines";
  label: string;
  image: string;
  bid: number;
  payout: number;
  net: number;
  data: Record<string, unknown> | null;
  created: string;
};

export type HistoryResponse = {
  data: HistoryRecord[];
  total: number;
  page: number;
  limit: number;
};
export type LeaderboardEntry = {
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
};
