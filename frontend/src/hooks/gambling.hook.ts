import { useUserStore } from "@/store/user.store";
import { useDataStore } from "@/store/data.store";
import { useQuery } from "@tanstack/react-query";
import { fetchGamblingConfig } from "@/api/gambling.api";

const FALLBACK_BID_OPTIONS = [1, 2, 3, 5, 8, 10, 15, 20, 30, 50];

export function useBidOptions() {
  const { data } = useQuery({
    queryKey: ["gamblingConfig"],
    queryFn: () => fetchGamblingConfig(),
    staleTime: Infinity,
  });

  return data?.bidOptions ?? FALLBACK_BID_OPTIONS;
}

export function useGamblingStore() {
  const user = useUserStore((state) => state.user);
  const gamblingBanned = useDataStore((state) => state.gamblingBanned);
  const setGamblingBanned = useDataStore((state) => state.setGamblingBanned);
  const balance = user?.money ?? 0;
  const ticketBalance = user?.tickets ?? 0;

  return { user, balance, ticketBalance, gamblingBanned, setGamblingBanned };
}
