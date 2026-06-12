import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchUsersByIds } from "@/lib/data";

const userCache = new Map<string, { username: string; avatar: string }>();
let fetchPromise: Promise<void> | null = null;

async function batchFetch(ids: string[]) {
  const missing = ids.filter((id) => !userCache.has(id));
  if (!missing.length) return;
  try {
    const users = await fetchUsersByIds(missing);
    for (const u of users) {
      userCache.set(String(u.id), {
        username: String(u.username ?? u.id),
        avatar: String(u.avatar ?? ""),
      });
    }
  } catch {}
}

export function UserAvatar({ userId }: { userId: string }) {
  const [user, setUser] = useState<{ username: string; avatar: string } | null>(
    userCache.get(userId) ?? null,
  );
  const [loading, setLoading] = useState(!userCache.has(userId));

  useEffect(() => {
    if (userCache.has(userId)) {
      setUser(userCache.get(userId)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (!fetchPromise) fetchPromise = batchFetch([userId]);
    else fetchPromise = fetchPromise.then(() => batchFetch([userId]));
    fetchPromise.then(() => {
      const u = userCache.get(userId);
      if (u) setUser(u);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Loader2 className="size-3 animate-spin" />
        <span className="text-muted max-w-24 truncate text-xs">{userId}</span>
      </span>
    );
  }

  if (!user) {
    return (
      <span className="text-muted max-w-24 truncate text-xs">{userId}</span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`${user.username} (${userId})`}
    >
      {user.avatar ? (
        <span className="text-base leading-none">{user.avatar}</span>
      ) : (
        <span className="bg-highlight-low text-muted inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold">
          {user.username[0]}
        </span>
      )}
      <span className="max-w-24 truncate text-xs font-medium">
        {user.username}
      </span>
    </span>
  );
}
