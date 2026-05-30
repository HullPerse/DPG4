import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { config } from "../config";

export type JwtUser = { sub: string; isAdmin: boolean };

export const authPlugin = new Elysia({ name: "auth" })
  .use(
    jwt({
      name: "jwt",
      secret: config.jwtSecret,
      exp: "7d",
    }),
  )
  .derive({ as: "scoped" }, async ({ jwt, headers, set }) => {
    const header = headers.authorization;
    const token = header?.startsWith("Bearer ")
      ? header.slice(7)
      : null;

    if (!token) {
      return { user: null as JwtUser | null, token: null as string | null };
    }

    const payload = await jwt.verify(token);
    if (!payload || typeof payload.sub !== "string") {
      return { user: null as JwtUser | null, token };
    }

    return {
      user: {
        sub: payload.sub,
        isAdmin: Boolean(payload.isAdmin),
      } as JwtUser,
      token,
    };
  })
  .macro({
    requireAuth: {
      async resolve({ user, set }) {
        if (!user) {
          set.status = 401;
          throw new Error("Unauthorized");
        }
        return { user };
      },
    },
  });

export function signToken(
  jwt: { sign: (payload: Record<string, unknown>) => Promise<string> },
  userId: string,
  isAdmin: boolean,
) {
  return jwt.sign({ sub: userId, isAdmin });
}
