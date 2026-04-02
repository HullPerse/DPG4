import { useQuery, useQueryClient } from "@tanstack/react-query";
import GameApi from "@/api/games.api";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import {
  ChevronLeft,
  List,
  LoaderPinwheel,
  NetworkIcon,
  Plus,
  Settings,
  Trash,
} from "lucide-react";
import { startTransition, useCallback, useState } from "react";
import { useSubscription } from "@/hooks/subscription.hook";
import { type Preset } from "@/types/games";
import Image from "@/components/shared/image.component";
import { Button } from "@/components/ui/button.component";
import { useUserStore } from "@/store/user.store";
import PresetSettings from "./settings.presets";
import NewGameLibrary from "../library/newGame.library";

const gameApi = new GameApi();

//TODO: highlight text
//TODO: filter 1. by label 2. by game name
//TODO: changing preset image every n-seconnds

export default function PresetsList({ searchTerms }: { searchTerms: string }) {
  const queryClient = useQueryClient();
  const isAdmin = useUserStore((state) => state.isAdmin);

  const [currentPreset, setCurrentPreset] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<
    | "presetAll"
    | "presetWheel"
    | "presetList"
    | "presetSettings"
    | "addPresetGame"
  >("presetAll");

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

  const getComponent = () => {
    if (!currentPreset) return;

    const buttonMap = {
      presetWheel: <LoaderPinwheel />,
      presetList: <List />,
      presetSettings: <PresetSettings id={currentPreset} />,
      addPresetGame: (
        <NewGameLibrary
          setCurrentGame={setCurrentTab as (gameId: string) => void}
          currentType="preset"
          presetId={currentPreset}
        />
      ),
    };

    return buttonMap[currentTab as keyof typeof buttonMap];
  };

  return (
    <main className="relative flex flex-col gap-2 w-full h-full overflow-y-auto p-2 bg-background border-t-2 border-highlight-high">
      {data
        ?.filter((preset) => preset.label.includes(searchTerms))
        .map((preset) => (
          <div
            key={preset.id}
            className="flex flex-row w-full h-24 border-2 border-highlight-high p-2 items-center justify-between bg-card shadow-sharp-sm"
          >
            {/* LABEL */}
            <section className="flex flex-row w-full h-full items-center gap-2">
              <div className="flex h-full aspect-video border-2 border-highlight-high overflow-hidden">
                {preset.games.length > 0 && (
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
                {preset.label} [{preset.games?.length ?? 0}]
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

      {/* TABS */}
      {currentTab !== "presetAll" && currentPreset && (
        <section className="absolute w-full h-full top-0 left-0 bg-background overflow-x-hidden">
          <div className="absolute flex flex-row top-2 right-2 gap-1 items-center">
            <Button
              title="Добавить игру"
              size="icon"
              variant="success"
              className="w-10 h-10"
              hidden={currentTab !== "presetSettings"}
              onClick={() => setCurrentTab("addPresetGame")}
            >
              <Plus />
            </Button>
            <Button
              title="Назад"
              size="icon"
              variant="error"
              className="w-10 h-10"
              onClick={() => {
                setCurrentTab("presetAll");
                setCurrentPreset(null);
              }}
            >
              <ChevronLeft />
            </Button>
          </div>
          {getComponent()}
        </section>
      )}
    </main>
  );
}
