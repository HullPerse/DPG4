import { useCallback, useState } from "react";
import HomePaint from "./tabs/home.paint";
import DrawPaint from "./tabs/draw.paint";
import ProfilePaint from "./tabs/profile.paint";
import ListPaint from "./tabs/list.paint";

function PaintRoot() {
  const [tab, setTab] = useState<"home" | "draw" | "list" | "profile">("home");

  const getComponent = useCallback(() => {
    const tabMap = {
      home: <HomePaint setTab={setTab} />,
      draw: <DrawPaint setTab={setTab} />,
      profile: <ProfilePaint setTab={setTab} />,
      list: <ListPaint setTab={setTab} />,
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
