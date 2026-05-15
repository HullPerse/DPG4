export interface Item {
  id?: string;
  // effect - status
  // roll   - type of game wheel roll
  // item   - usable item
  // other  - not usable item
  type: "effect" | "item" | "roll" | "other";
  label: string;
  description: string;
  charge: number;
  image: File | null;
  rollable: boolean;
  created?: string;
}

export interface Inventory {
  id?: string;
  owner: string;
  label: string;
  description: string;
  charge: number;
  image: File;
}

export interface Market {
  id?: string;
  originalId: string;
  owner: {
    id: string;
    username: string;
    avatar: string;
  };
  label: string;
  description: string;
  charge: number;
  image: File;
  price: number;
  discount?: number;
}

export type Trade = {
  id: string;
  money: number;
  items: string[];
};
