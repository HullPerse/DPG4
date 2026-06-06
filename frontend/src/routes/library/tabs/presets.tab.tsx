import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import {
  Braces,
  CheckCheck,
  ChevronLeft,
  ExternalLink,
  Plus,
} from "lucide-react";
import { memo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
 
 import { useDebounce } from "@/hooks/debounce.hook";
 import { useUserStore } from "@/store/user.store";
 
 import PresetsList from "../components/presets/presets.presets";
 
 import GameApi from "@/api/games.api";
 import PresetSettings from "../components/presets/list.presets";
 import NewGameLibrary from "../components/library/newGame.library";
 import PresetsWheel from "../components/presets/wheel.presets";
 import { useDataStore } from "@/store/data.store";
 import { openUrl } from "@tauri-apps/plugin-opener";
 const gameApi = new GameApi();

function PresetsTab() {
  const isAdmin = useUserStore((state) => state.isAdmin);
  const user = useUserStore((state) => state.user);
  const accessToken = useDataStore((state) => state.accessToken);
  const setAccessToken = useDataStore((state) => state.setAccessToken);

  const [addToken, setAddToken] = useState<boolean>(false);
  const refetchPresetsRef = useRef<(() => void) | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const [currentPreset, setCurrentPreset] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [currentTab, setCurrentTab] = useState<
    "presetAll" | "presetWheel" | "presetList" | "addPresetGame"
  >("presetAll");

  const addPresetMutation = useMutation({
    mutationFn: () => gameApi.addPreset(searchTerm),
    onSuccess: () => setSearchTerm(""),
  });

  const getComponent = () => {
    if (!currentPreset)
      return (
        <PresetsList
          searchTerms={debouncedSearch}
          setCurrentPreset={setCurrentPreset}
          setCurrentTab={setCurrentTab}
          refetchPresetsRef={refetchPresetsRef}
        />
      );

    const buttonMap = {
      presetWheel: <PresetsWheel id={currentPreset.id} />,
      presetList: (
        <PresetSettings id={currentPreset.id} searchTerms={debouncedSearch} />
      ),
      addPresetGame: (
        <NewGameLibrary
          setCurrentGame={setCurrentTab as (gameId: string) => void}
          currentType="preset"
          presetId={currentPreset.id}
          existingId={searchTerm}
        />
      ),
    };

    return buttonMap[currentTab as keyof typeof buttonMap];
  };

  return (
    <main className="relative flex flex-col h-full w-full overflow-hidden">
      <section className="flex flex-row w-full gap-2 items-center justify-center p-2 border-b-2 border-highlight-high">
        {addToken && (
          <Input
            placeholder="Токен"
            type="text"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
          />
        )}

        {addToken && (
          <Button
            variant="link"
            className="border border-text text-text active:translate-x-0 active:translate-y-0 w-10 h-10"
            onClick={() =>
              openUrl(
                "https://store.steampowered.com/pointssummary/ajaxgetasyncconfig",
              )
            }
          >
            <ExternalLink />
          </Button>
        )}

        <Button
          variant="link"
          className="border border-text text-text active:translate-x-0 active:translate-y-0 w-10 h-10"
          onClick={() => {
            if (addToken) refetchPresetsRef.current?.();
            setAddToken(!addToken);
          }}
        >
          {addToken ? <CheckCheck /> : <Braces />}
        </Button>

        <Input
          type="text"
          placeholder="Поиск пресетов"
          className="h-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={addPresetMutation.isPending || currentTab === "presetWheel"}
        />

        {isAdmin && currentTab === "presetAll" && (
          <Button
            variant="link"
            className="border border-text text-text active:translate-x-0 active:translate-y-0 w-10 h-10"
            loading={addPresetMutation.isPending}
            disabled={!searchTerm}
            onClick={() => addPresetMutation.mutate()}
          >
            <Plus />
          </Button>
        )}
        <Button
          title="Добавить игру"
          size="icon"
          variant="success"
          className="w-10 h-10"
          hidden={
            (!isAdmin &&
              !currentPreset?.label?.includes(String(user?.username))) ||
            currentTab === "addPresetGame" ||
            currentTab === "presetWheel"
          }
          onClick={() => setCurrentTab("addPresetGame")}
        >
          <Plus />
        </Button>
        <Button
          title="Назад"
          size="icon"
          variant="error"
          className="w-10 h-10"
          hidden={currentTab === "presetAll"}
          onClick={() => {
            if (currentPreset && currentTab === "addPresetGame") {
              return setCurrentTab("presetList");
            }

            setCurrentTab("presetAll");
            setCurrentPreset(null);
          }}
        >
          <ChevronLeft />
        </Button>
      </section>

      {/* TABS */}
      <section className="flex flex-1 bg-background overflow-auto">
        {getComponent()}
      </section>
    </main>
  );
}

export default memo(PresetsTab);
