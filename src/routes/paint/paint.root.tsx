import { useCallback, useState } from "react";
import HomePaint from "./tabs/home.paint";
import DrawPage from "./tabs/draw.paint";

function PaintRoot() {
  const [tab, setTab] = useState<"home" | "draw" | "list" | "profile">("draw");

  const getComponent = useCallback(() => {
    const tabMap = {
      home: <HomePaint setTab={setTab} />,
      draw: <DrawPage />,
      list: <>3</>,
      profile: <>4</>,
    };

    return tabMap[(tab as keyof typeof tabMap) ?? "home"];
  }, [tab]);

  return (
    <main className="flex h-full w-full flex-col">
      <section className="flex flex-col gap-2 items-center overflow-y-auto w-full h-full">
        {getComponent()}
      </section>
    </main>
  );
}

export default PaintRoot;
