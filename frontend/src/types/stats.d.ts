type UserStatsProfile = {
  accountAge: number;
  totalMoney: number;
  position: number;
  statusCount: number;
  registeredDate: string;
};

export type ItemsByType = {
  type: string;
  count: number;
};

export type TopItem = {
  label: string;
  count: number;
};

export type UserStatsInventory = {
  totalItems: number;
  itemsByType: ItemsByType[];
  topItems: TopItem[];
  totalCharge: number;
  uniqueLabels: number;
};

export type DailyActivity = {
  date: string;
  received: number;
  sent: number;
  sold: number;
  bought: number;
  used: number;
  deleted: number;
  listed: number;
  unlisted: number;
};

export type UserStatsInventoryHistory = {
  dailyActivity: DailyActivity[];
  totalReceived: number;
  totalSent: number;
  totalSold: number;
  totalBought: number;
  totalUsed: number;
  totalDeleted: number;
  marketListed: number;
  marketUnlisted: number;
  tradesIn: number;
  tradesOut: number;
};

export type UserStatsGambling = {
  totalPlayed: number;
  totalWagered: number;
  totalNet: number;
  winRate: number;
  biggestWin: number;
  avgBet: number;
};

export type UserStatsGames = {
  total: number;
  completed: number;
  playing: number;
  dropped: number;
  rerolled: number;
  reviewsCount: number;
  totalPlaytime: number;
};

export type UserStatsResponse = {
  profile: UserStatsProfile;
  inventory: UserStatsInventory;
  inventoryHistory: UserStatsInventoryHistory;
  gambling: UserStatsGambling;
  games: UserStatsGames;
};

export type DailyNet = {
  date: string;
  net: number;
  gamesPlayed: number;
};

export type GameDistribution = {
  type: string;
  count: number;
  totalNet: number;
};

export type BetDistribution = {
  range: string;
  count: number;
};

type StatsSummary = {
  totalPlayed: number;
  totalWagered: number;
  totalNet: number;
  winRate: number;
  biggestWin: number;
  avgBet: number;
};

export type StatsResponse = {
  dailyNet: DailyNet[];
  gameDistribution: GameDistribution[];
  betDistribution: BetDistribution[];
  summary: StatsSummary;
};
