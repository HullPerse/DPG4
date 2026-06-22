export interface JwtUser {
  id?: string;
  sub: string;
  isAdmin: boolean;
  username: string | null;
}
