export interface User {
  id?: string;
  username: string;
  password: string;
  passwordConfirm?: string;
  email?: string;
  avatar: string;
  color: string;
  isAdmin?: boolean;
  position: number;
  money: number;
  steam: string;

  //MOVE_POSITIVE - waiting for user to move around the map after COMPLETIG GAME
  //MOVE_NEGATIVE - waiting for user to move aroudn the map after DROPPING GAME
  //GAMEADD - waiting for user to roll a GAMEADD
  //GAMEFINISH - waiting for user to finish the game
  currentAction: "MOVE_POSITIVE" | "MOVE_NEGATIVE" | "GAMEADD" | "GAMEFINISH";

  //0-4h   = 1d6
  //5-10h  = 1d6
  //11-16h = 2d6
  //17-24h = 2d6
  //25-40h = 3d6
  //40h+   = 4d6
  //-----LAST TWO ROWS-----
  //0h+    = 1d6
  currentDice: number;

  status?: UserStatus[];

  place: "0" | "1" | "2" | "3";

  //TODO: MOVE TO STATUS LATER
  subscribed: boolean;
}

//TODO: write all possible types later
export type UserStatus = {
  type: StatusType;
  values?: string | number;
  count?: number;
  item: string; //item label to remove it later
};

export type StatusType =
  //effect types
  | ""
  | ""
  | ""

  //item types
  | ""
  | ""
  | ""

  //other types
  | "craft"
  | ""
  | "";
