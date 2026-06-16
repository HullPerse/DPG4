import { eq } from "drizzle-orm";
import { db } from "../db";
import * as schema from "../db/schema";

const usernameCache = new Map<
  string,
  { username: string; expiresAt: number }
>();
const CACHE_TTL = 5 * 60 * 1000;

export async function resolveUsername(userId: string): Promise<string | null> {
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
      usernameCache.set(userId, {
        username: row.username,
        expiresAt: Date.now() + CACHE_TTL,
      });
      return row.username;
    }
  } catch {}
  return null;
}
