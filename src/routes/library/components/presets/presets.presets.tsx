import { useQuery, useQueryClient } from "@tanstack/react-query";
import GameApi from "@/api/games.api";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon } from "lucide-react";
import { startTransition, useCallback } from "react";
import { useSubscription } from "@/hooks/subscription.hook";
import { type Preset } from "@/types/games";
import PresetComponent from "@/components/shared/preset.component";

const gameApi = new GameApi();

export default function PresetsList({
  searchTerms,
  setCurrentPreset,
  setCurrentTab,
}: {
  searchTerms: string;
  setCurrentPreset: (preset: string) => void;
  setCurrentTab: (
    tab: "presetAll" | "presetWheel" | "presetList" | "addPresetGame",
  ) => void;
}) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["presetsList"],
    queryFn: async (): Promise<Preset[]> => {
      return await gameApi.getPresets();
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["presetsList"],
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
    <main className="relative flex flex-col gap-2 w-full h-full p-2 overflow-y-auto bg-background">
      {data

        ?.sort((a, b) => a.label.localeCompare(b.label))
        .filter((preset) =>
          preset.label.toUpperCase().includes(searchTerms.toUpperCase()),
        )
        .map((preset) => (
          <PresetComponent
            key={preset.id}
            preset={preset}
            searchTerms={searchTerms}
            setCurrentPreset={setCurrentPreset}
            setCurrentTab={setCurrentTab}
          />
        ))}
    </main>
  );
}
