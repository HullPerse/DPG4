export interface Item {
  id?: string;
  label: string;
  description: string;
  charge: number;
  image: File;
}

export interface Inventory {
  id?: string;
  owner: string;
  label: string;
  description: string;
  charge: number;
  image: File;
}
