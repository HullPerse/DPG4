import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { eq } from "drizzle-orm";
import { config } from "../config";
import * as schema from "../db/schema";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

export type JwtUser = { sub: string; isAdmin: boolean; username: string | null };

const usernameCache = new Map<string, { username: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function resolveUsername(userId: string, db: BunSQLiteDatabase<typeof schema>): Promise<string | null> {
  const cached = usernameCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.username;
  }
  try {
    const [row] = await db
      .select({ username: schema.users.username })
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    if (row) {
      usernameCache.set(userId, { username: row.username, expiresAt: Date.now() + CACHE_TTL });
      return row.username;
    }
  } catch {}
  return null;
}

export const authPlugin = new Elysia({ name: "auth" })
  .use(
    jwt({
      name: "jwt",
      secret: config.jwtSecret,
      exp: "7d",
    }),
  )
  .derive({ as: "scoped" }, async ({ jwt, headers, db }) => {
    const header = headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return { user: null as JwtUser | null, token: null as string | null };
    }

    const payload = await jwt.verify(token);
    if (!payload || typeof payload.sub !== "string") {
      return { user: null as JwtUser | null, token };
    }

    const username = await resolveUsername(payload.sub, db);

    return {
      user: {
        sub: payload.sub,
        isAdmin: Boolean(payload.isAdmin),
        username,
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
