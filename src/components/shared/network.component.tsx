import { checkConnection } from "@/api/client.api";
import { useQuery } from "@tanstack/react-query";
import { Loader, Wifi, WifiOff, WifiSync } from "lucide-react";
import { useCallback, useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { useDataStore } from "@/store/data.store";
import { cn, networkClass } from "@/lib/utils";
import { useNetworkState } from "@uidotdev/usehooks";

export default function NetworkConnection() {
  const network = useNetworkState();
  const setConnected = useDataStore((state) => state.setConnected);

  //checking for connection
  const { data, isLoading, isError, refetch, isRefetching, isRefetchError } =
    useQuery({
      queryKey: ["connection", network.online],
      queryFn: async () => {
        const isOnline = network.online;
        let [isConnected, updateAvailable] = [false, false];

        try {
          isConnected = await checkConnection();
        } catch {
          isConnected = false;
        }

        try {
          const update = await check();
          updateAvailable = !!update;
        } catch {
          updateAvailable = false;
        }

        setConnected(isConnected);
        return { isConnected: isConnected && isOnline, updateAvailable };
      },
    });

  const handleRefetch = useCallback(() => {
    refetch().then((data) => {
      setConnected(!!data.data?.isConnected);
    });
  }, [refetch]);

  //refetch every 5 minutes
  useEffect(() => {
    return () => {
      clearInterval(
        setInterval(
          () => {
            handleRefetch();
          },
          1000 * 60 * 5,
        ),
      );
    };
  }, []);

  //connection loading
  if (isLoading || isRefetching)
    return (
      <Loader
        className={cn(
          "h-4 w-4 animate-spin",
          networkClass(!!data?.isConnected),
        )}
      />
    );

  //connection lost
  if (isError || !data?.isConnected || isRefetchError)
    return (
      <WifiOff
        className="h-4 w-4 animate-pulse cursor-pointer text-red-700/60 hover:text-red-700"
        onClick={handleRefetch}
      />
    );

  //connection update
  if (data.updateAvailable)
    return (
      <WifiSync
        className="h-4 w-4 animate-pulse cursor-pointer text-yellow-700/60 hover:text-yellow-700"
        onClick={() => {}}
      />
    );

  //connection found
  return (
    <Wifi
      className="h-4 w-4 cursor-pointer hover:text-text"
      onClick={handleRefetch}
    />
  );
}
