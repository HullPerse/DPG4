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
  currentAction: "MOVE" | "GAMEADD" | "GAMEFINISH";
}
