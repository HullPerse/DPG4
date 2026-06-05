import { useUserStore } from "@/store/user.store";
import { useDataStore } from "@/store/data.store";
import { useState, useEffect } from "react";
import { fetchGamblingConfig } from "@/api/gambling.api";

const FALLBACK_BID_OPTIONS = [1, 2, 3, 5, 8, 10, 15, 20, 30, 50];

export function useBidOptions() {
  const [bidOptions, setBidOptions] = useState<number[]>(FALLBACK_BID_OPTIONS);

  useEffect(() => {
    fetchGamblingConfig().then((c) => setBidOptions(c.bidOptions));
  }, []);

  return bidOptions;
}

export function useGamblingStore() {
  const user = useUserStore((state) => state.user);
  const gamblingBanned = useDataStore((state) => state.gamblingBanned);
  const setGamblingBanned = useDataStore((state) => state.setGamblingBanned);
  const balance = user?.money ?? 0;

  return { user, balance, gamblingBanned, setGamblingBanned };
}
