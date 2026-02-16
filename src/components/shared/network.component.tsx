import { checkConnection } from "@/api/client.api";
import { useQuery } from "@tanstack/react-query";
import { Loader, Wifi, WifiOff, WifiSync } from "lucide-react";
import { useCallback, useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { useDataStore } from "@/store/data.store";

export default function NetworkConnection() {
  const setConnected = useDataStore((state) => state.setConnected);

  //checking for connection
  const { data, isLoading, isError, refetch, isRefetching, isRefetchError } =
    useQuery({
      queryKey: ["connection"],
      queryFn: async () => {
        let isConnected = false;
        try {
          isConnected = await checkConnection();
        } catch {
          isConnected = false;
        }

        let updateAvailable = false;
        try {
          const update = await check();
          updateAvailable = !!update;
        } catch {
          updateAvailable = false;
        }

        setConnected(isConnected);
        return { isConnected, updateAvailable };
      },
    });

  const handleRefetch = useCallback(() => {
    refetch().then((data) => {
      setConnected(!!data.data?.isConnected);
    });
  }, [refetch]);

  //refetch every 5 minutes
  useEffect(() => {
    setInterval(
      () => {
        handleRefetch();
      },
      1000 * 60 * 5,
    );
  }, []);

  //connection loading
  if (isLoading || isRefetching)
    return <Loader className="w-4 h-4 animate-spin" />;

  //connection lost
  if (isError || !data?.isConnected || isRefetchError)
    return (
      <WifiOff
        className="w-4 h-4 text-red-700/60 hover:text-red-700 cursor-pointer  animate-pulse"
        onClick={handleRefetch}
      />
    );

  //connection update
  if (data.updateAvailable)
    return (
      <WifiSync
        className="w-4 h-4 text-yellow-700/60 hover:text-yellow-700 cursor-pointer animate-pulse"
        onClick={() => {}}
      />
    );

  //connection found
  return (
    <Wifi
      className="w-4 h-4 hover:text-text cursor-pointer"
      onClick={handleRefetch}
    />
  );
}
