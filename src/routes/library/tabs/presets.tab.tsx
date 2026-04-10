import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { ChevronLeft, Plus } from "lucide-react";
import { memo, useCallback, useState } from "react";

import { useUserStore } from "@/store/user.store";

import { SmallLoader } from "@/components/shared/loader.component";
import PresetsList from "../components/presets/presets.presets";

import GameApi from "@/api/games.api";
import PresetSettings from "../components/presets/list.presets";
import NewGameLibrary from "../components/library/newGame.library";
import PresetsWheel from "../components/presets/wheel.presets";
const gameApi = new GameApi();

function PresetsTab() {
  const isAdmin = useUserStore((state) => state.isAdmin);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoadinng] = useState(false);
  const [currentPreset, setCurrentPreset] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<
    "presetAll" | "presetWheel" | "presetList" | "addPresetGame"
  >("presetAll");

  const handleAddPreset = useCallback(async () => {
    setLoadinng(true);
    await gameApi.addPreset(searchTerm);
    setSearchTerm("");
    setLoadinng(false);
  }, [searchTerm]);

  const getComponent = () => {
    if (!currentPreset)
      return (
        <PresetsList
          searchTerms={searchTerm}
          setCurrentPreset={setCurrentPreset}
          setCurrentTab={setCurrentTab}
        />
      );

    const buttonMap = {
      presetWheel: <PresetsWheel id={currentPreset} />,
      presetList: (
        <PresetSettings id={currentPreset} searchTerms={searchTerm} />
      ),
      addPresetGame: (
        <NewGameLibrary
          setCurrentGame={setCurrentTab as (gameId: string) => void}
          currentType="preset"
          presetId={currentPreset}
          existingId={searchTerm}
        />
      ),
    };

    return buttonMap[currentTab as keyof typeof buttonMap];
  };

  return (
    <main className="relative flex flex-col h-full w-full">
      <section className="flex flex-row w-full gap-2 items-center justify-center p-2 border-b-2 border-highlight-high">
        <Input
          type="text"
          placeholder="Поиск пресетов"
          className="h-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={loading || currentTab === "presetWheel"}
        />

        {isAdmin && currentTab === "presetAll" && (
          <Button
            variant="link"
            className="border border-text text-text active:translate-x-0 active:translate-y-0 w-10 h-10"
            onClick={handleAddPreset}
            disabled={!searchTerm || loading}
          >
            {loading ? <SmallLoader /> : <Plus />}
          </Button>
        )}
        <Button
          title="Добавить игру"
          size="icon"
          variant="success"
          className="w-10 h-10"
          hidden={
            !isAdmin ||
            currentTab === "addPresetGame" ||
            currentTab === "presetAll" ||
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
      <section
        className="flex w-full h-full bg-background"
        style={{
          paddingBottom: currentTab === "presetAll" ? "105px" : "0px",
        }}
      >
        {getComponent()}
      </section>
    </main>
  );
}

export default memo(PresetsTab);
