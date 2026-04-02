import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { Plus } from "lucide-react";
import { memo, useCallback, useState } from "react";

import { useUserStore } from "@/store/user.store";

import { SmallLoader } from "@/components/shared/loader.component";
import PresetsList from "../components/presets/presets.presets";

import GameApi from "@/api/games.api";
const gameApi = new GameApi();

function PresetsTab() {
  const isAdmin = useUserStore((state) => state.isAdmin);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoadinng] = useState(false);

  const handleAddPreset = useCallback(async () => {
    setLoadinng(true);
    await gameApi.addPreset(searchTerm);
    setSearchTerm("");
    setLoadinng(false);
  }, [searchTerm]);

  return (
    <main className="relative flex h-full w-full flex-col">
      <section className="flex flex-row w-full gap-2 items-center justify-center p-2">
        <Input
          type="text"
          placeholder="Найти пресет"
          className="h-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {isAdmin && (
          <Button
            variant="link"
            className="border border-text text-text active:translate-x-0 active:translate-y-0 w-10 h-10"
            onClick={handleAddPreset}
            disabled={!searchTerm || loading}
          >
            {loading ? <SmallLoader /> : <Plus />}
          </Button>
        )}
      </section>

      <section className="flex flex-col h-full w-full">
        <PresetsList searchTerms={searchTerm} />
      </section>
    </main>
  );
}

export default memo(PresetsTab);
