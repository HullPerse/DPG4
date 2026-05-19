export interface Item {
  id?: string;
  type: ItemType;
  label: string;
  description: string;
  charge: number;
  image: File | null;
  rollable: boolean;
  created?: string;
}

export interface Inventory {
  id?: string;
  type: ItemType;
  owner: string;
  label: string;
  description: string;
  charge: number;
  image: File;
}

export interface Market {
  id?: string;
  type: ItemType;
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

/**
 * @description
 * 1. effect - status
 * 2. roll   - type of game wheel roll
 * 3. item   - usable item
 * 4. other  - not usable item
 */
export type ItemType = "effect" | "item" | "roll" | "other";

export interface effectInterface {
  label: string;
  type: "modal" | "effect";
  effect?: () => void;
  body?: (close: () => void) => ReactNode;
}
