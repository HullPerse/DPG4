import { Edit, GlobeX } from "lucide-react";
import { BigError } from "./components/shared/error.component";
import { useUserStore } from "./store/user.store";
import { useNetworkState } from "@uidotdev/usehooks";
import { useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import Desktop from "./routes/desktop/desktop.root";
import { Button } from "./components/ui/button.component";
import { WINDOWS } from "./config/apps.config";
import Window from "./components/shared/window.component";
import { WindowProps } from "./types/window";
import { WindowLoader } from "./components/shared/loader.component";
import { useDataStore } from "./store/data.store";
import { invoke } from "@tauri-apps/api/core";

const WallpaperApp = lazy(() => import("./routes/desktop/apps/wallpaper.app"));

function App() {
  const network = useNetworkState();
  const navigate = useNavigate();

  const wallpaperData = useDataStore((state) => state.wallpaper);
  const isAuth = useUserStore((state) => state.isAuth);

  const [wallpaper, setWallpaper] = useState<string | null>(null);

  //initialize wallpaper data
  const getWallpaper = async () => {
    const wallpaper = await invoke<string>("get_wallpaper_by_name", {
      name: wallpaperData,
    });

    const dataUrl = await invoke<string>("get_wallpaper_data", {
      path: wallpaper,
    });

    if (dataUrl) {
      setWallpaper(dataUrl);
    }
  };

  //navigate to auth if user not logged in
  useEffect(() => {
    if (!isAuth) {
      navigate({
        to: `/auth`,
        replace: true,
      });
    }

    getWallpaper();
  }, [isAuth, navigate]);

  if (!network.online) {
    return (
      <BigError
        error={new Error("Не удалось подключиться к сети")}
        icon={<GlobeX className="animate-pulse size-28 text-red-500" />}
        button
      />
    );
  }

  return (
    <main
      className="relative w-screen h-screen text-text bg-background p-2 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${wallpaper})`,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* WINDOWS */}
      <Window
        {...(WINDOWS.find((w) => w.id === "wallpaper") as WindowProps)}
        isActive
      >
        <Suspense fallback={<WindowLoader />}>
          <WallpaperApp setWallpaper={setWallpaper} />
        </Suspense>
      </Window>
      {/* DESKTOP */}
      <Desktop />
      {/* WALLAPAPER */}
      <Button variant="ghost" className="absolute right-1 bottom-1 w-14 h-14">
        <Edit />
      </Button>
    </main>
  );
}

export default App;
