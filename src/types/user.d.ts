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

  //MOVE - waiting for user to move around the map
  //GAMEADD - waiting for user to roll a GAMEADD
  //GAMEFINISH - waiting for user to finish the game
  currentAction: "MOVE" | "GAMEADD" | "GAMEFINISH";
}
