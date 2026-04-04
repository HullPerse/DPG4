import { Preset } from "@/types/games";
import { memo } from "react";
import Image from "@/components/shared/image.component";
import { Button } from "../ui/button.component";
import { List, LoaderPinwheel, Trash } from "lucide-react";
import { highlightText } from "@/lib/utils";
import { useUserStore } from "@/store/user.store";
import GameApi from "@/api/games.api";
const gameApi = new GameApi();

function PresetComponent({
  preset,
  searchTerms,
  setCurrentPreset,
  setCurrentTab,
}: {
  preset: Preset;
  searchTerms: string;
  setCurrentPreset: (preset: string) => void;
  setCurrentTab: (
    tab: "presetAll" | "presetWheel" | "presetList" | "addPresetGame",
  ) => void;
}) {
  const isAdmin = useUserStore((state) => state.isAdmin);

  return (
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
                preset.games[
                  Math.floor(Math.random() * (preset.games?.length ?? 0) * 1)
                ].capsuleImage
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
  );
}

export default memo(PresetComponent);
