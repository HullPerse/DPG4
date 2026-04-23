import { checkConnection } from "@/api/client.api";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader, Wifi, WifiOff, WifiSync } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useDataStore } from "@/store/data.store";
import { cn, networkClass, checkForUpdates, installUpdate } from "@/lib/utils";
import { useNetworkState } from "@uidotdev/usehooks";
import { useToastStore } from "@/store/toast.store";
import type { UpdateData } from "@/types/activity";

export default function NetworkConnection() {
  const network = useNetworkState();
  const setConnected = useDataStore((state) => state.setConnected);
  const addToast = useToastStore((s) => s.addToast);

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
          const update = await checkForUpdates();
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

  const handleUpdateClick = useCallback(() => {
    checkForUpdates().then((update) => {
      if (!update) return;

      const toastData: UpdateData = {
        id: "update",
        author: "System",
        image: "⚠️",
        type: "emoji",
        text: `Версия ${update.version} доступна для скачивания`,
        created: new Date().toISOString(),
        timeout: Infinity,
        showClose: true,
        onClick: {
          fn: () => installUpdate(update),
          icon: <Download className="size-4" />,
        },
      };

      addToast(toastData);
    });
  }, [addToast]);

  //refetch every 5 minutes
  useEffect(() => {
    const interval = setInterval(
      () => {
        handleRefetch();
      },
      1000 * 60 * 5,
    );

    return () => clearInterval(interval);
  }, [handleRefetch]);

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
        onClick={handleUpdateClick}
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
