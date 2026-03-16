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
    <main className="flex flex-col w-full h-full items-center">
      <section className="flex flex-row w-full py-2 gap-2">
        <Button
          variant="link"
          onClick={() => setNewType("game")}
          className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 w-1/2"
          disabled={newType === "game"}
        >
          STEAM
        </Button>
        <Button
          variant="link"
          onClick={() => setNewType("custom")}
          className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 w-1/2"
          disabled={newType === "custom"}
        >
          КАСТОМНАЯ
        </Button>
      </section>

      <section className="flex flex-col w-full h-full overflow-y-auto">
        {getComponent}
      </section>
    </main>
  );
}
