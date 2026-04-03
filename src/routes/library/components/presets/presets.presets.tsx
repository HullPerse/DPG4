import { useQuery, useQueryClient } from "@tanstack/react-query";
import GameApi from "@/api/games.api";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import {
  List,
  LoaderPinwheel,
  NetworkIcon,
  Settings,
  Trash,
} from "lucide-react";
import { startTransition, useCallback } from "react";
import { useSubscription } from "@/hooks/subscription.hook";
import { type Preset } from "@/types/games";
import Image from "@/components/shared/image.component";
import { Button } from "@/components/ui/button.component";
import { useUserStore } from "@/store/user.store";

const gameApi = new GameApi();

export default function PresetsList({
  searchTerms,
  setCurrentPreset,
  setCurrentTab,
}: {
  searchTerms: string;
  setCurrentPreset: (preset: string) => void;
  setCurrentTab: (
    tab:
      | "presetAll"
      | "presetWheel"
      | "presetList"
      | "presetSettings"
      | "addPresetGame",
  ) => void;
}) {
  const queryClient = useQueryClient();
  const isAdmin = useUserStore((state) => state.isAdmin);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["presetsList"],
    queryFn: async (): Promise<Preset[]> => await gameApi.getPresets(),
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

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );

    return text.split(regex).map((part, index) => {
      if (!regex.test(part)) return part;
      return (
        <span
          key={index}
          className="bg-amber-500/20 text-white rounded font-bold"
        >
          {part}
        </span>
      );
    });
  };

  return (
    <main className="relative flex flex-col gap-2 w-full h-full p-2 overflow-y-auto bg-background">
      {data
        ?.filter((preset) =>
          preset.label.toUpperCase().includes(searchTerms.toUpperCase()),
        )
        .map((preset) => (
          <div
            key={preset.id}
            className="flex flex-row w-full h-24 min-h-24 border-2 border-highlight-high p-2 items-center justify-between bg-card shadow-sharp-sm"
          >
            {/* LABEL */}
            <section className="flex flex-row w-full h-full items-center gap-2">
              <div className="flex h-full w-40 aspect-video border-2 border-highlight-high overflow-hidden">
                {preset.games?.length > 0 && (
                  <Image
                    src={
                      preset.games[0].capsuleImage ??
                      "https://placehold.co/16x10"
                    }
                    alt={preset.label}
                  />
                )}
              </div>
              <span className="font-bold truncate line-clamp-1">
                {highlightText(preset.label, searchTerms)} [
                {preset.games?.length ?? 0}]
              </span>
            </section>

            {/* BUTTONS */}
            <section className="flex flex-row items-center gap-1">
              <Button
                title="Колесо пресета"
                size="icon"
                onClick={() => {
                  setCurrentPreset(preset.id);
                  setCurrentTab("presetWheel");
                }}
              >
                <LoaderPinwheel />
              </Button>
              <Button
                title="Открыть пресет"
                size="icon"
                onClick={() => {
                  setCurrentPreset(preset.id);
                  setCurrentTab("presetList");
                }}
              >
                <List />
              </Button>
              <Button
                title="Редактировать пресет"
                size="icon"
                onClick={() => {
                  setCurrentPreset(preset.id);
                  setCurrentTab("presetSettings");
                }}
                hidden={!isAdmin}
              >
                <Settings />
              </Button>
              <Button
                title="Удалить пресет"
                variant="error"
                size="icon"
                onClick={async () => {
                  if (!isAdmin) return;

                  await gameApi.removePreset(preset.id);
                }}
                hidden={!isAdmin}
                disabled={!isAdmin}
              >
                <Trash />
              </Button>
            </section>
          </div>
        ))}
    </main>
  );
}
