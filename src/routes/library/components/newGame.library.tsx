import { Button } from "@/components/ui/button.component";
import { useMemo, useState } from "react";
import SteamLibrary from "./steam.library";
import CustomLibrary from "./custom.library";

export default function NewGameLibrary() {
  const [newType, setNewType] = useState<"game" | "custom">("game");

  const getComponent = useMemo(() => {
    if (newType === "game") return <SteamLibrary />;
    return <CustomLibrary />;
  }, [newType]);

  return (
    <main className="flex h-full w-full flex-col items-center">
      <section className="flex w-full flex-row gap-2 py-2">
        <Button
          variant="link"
          onClick={() => setNewType("game")}
          className="w-1/2 text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85"
          disabled={newType === "game"}
        >
          STEAM
        </Button>
        <Button
          variant="link"
          onClick={() => setNewType("custom")}
          className="w-1/2 text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85"
          disabled={newType === "custom"}
        >
          КАСТОМНАЯ
        </Button>
      </section>

      <section className="flex h-full w-full flex-col overflow-y-auto">
        {getComponent}
      </section>
    </main>
  );
}
