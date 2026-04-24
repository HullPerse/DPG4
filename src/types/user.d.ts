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
  currentDice: 1;

  //statuses will be in an array of strings
  //each statuses will appear there after specific actions
  status?: string[];

  place: "0" | "1" | "2" | "3";

  subscribed: boolean;
}
