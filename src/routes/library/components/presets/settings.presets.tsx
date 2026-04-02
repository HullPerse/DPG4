import { Preset } from "@/types/games";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { startTransition, useCallback } from "react";

import GameApi from "@/api/games.api";
import { useSubscription } from "@/hooks/subscription.hook";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon } from "lucide-react";
const gameApi = new GameApi();

function PresetSettings({ id }: { id: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["presetGames", id],
    queryFn: async (): Promise<Preset> => await gameApi.getPresetById(id),
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["presetGames", id],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("presets", "*", invalidateQuery);

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка")}
        icon={<NetworkIcon />}
        refresh={refetch}
        button
      />
    );

  return (
    <main>
      {data?.games &&
        data.games.map((game) => <div key={game.id}>{game.name}</div>)}
    </main>
  );
}

export default PresetSettings;
