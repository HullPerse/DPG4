export interface Activity {
  author?: string;
  image?: string;
  type?: string;
  text: string;
}

export type InventoryAction =
  | "receive"
  | "send"
  | "sell"
  | "buy"
  | "use"
  | "delete"
  | "grant"
  | "trade_out"
  | "trade_in"
  | "market_list"
  | "market_unlist"
  | "charge_change";
