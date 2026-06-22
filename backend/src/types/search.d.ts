export interface FtsUserRow {
  id: string;
  username: string;
  avatar: string;
  color: string;
  status: string;
  money: number;
  position: number;
  isAdmin: number;
  created: string;
}

export interface FtsGameRow {
  id: string;
  data: string;
  status: string;
  user: string;
}

export interface FtsItemRow {
  id: string;
  type: string;
  label: string;
  description: string;
  charge: number;
  rollable: number;
  status: string;
  imageMime: string | null;
  hasImage: number;
  created: string;
  updated: string;
}
