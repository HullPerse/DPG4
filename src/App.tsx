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

const WallpaperApp = lazy(() => import("./routes/desktop/apps/wallpaper.app"));

function App() {
  const network = useNetworkState();
  const navigate = useNavigate();

  const isAuth = useUserStore((state) => state.isAuth);

  const [windows, setWindows] = useState<WindowProps[]>([]);

  //navigate to auth if user not logged in
  useEffect(() => {
    if (!isAuth) {
      navigate({
        to: `/auth`,
        replace: true,
      });
    }
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

  //
  //   const [nextZIndex, setNextZIndex] = useState(1)
  //
  //   const openApp = useCallback((appId: string) => {
  //     const existingWindow = windows.find((w) => w.id === appId)

  //     if (existingWindow) {
  //       // If window exists, bring it to front and unminimize
  //       setWindows((prev) =>
  //         prev.map((w) =>
  //           w.id === appId
  //             ? { ...w, isMinimized: false, zIndex: nextZIndex }
  //             : w
  //         )
  //       )
  //       setNextZIndex((z) => z + 1)
  //       return
  //     }

  //     const config = appConfigs[appId]
  //     if (!config) return

  //     const newWindow: AppWindow = {
  //       id: appId,
  //       title: config.title,
  //       component: config.component,
  //       isMinimized: false,
  //       zIndex: nextZIndex,
  //       initialPosition: {
  //         x: 100 + (windows.length % 5) * 30,
  //         y: 50 + (windows.length % 5) * 30,
  //       },
  //       initialSize: config.size,
  //     }

  //     setWindows((prev) => [...prev, newWindow])
  //     setNextZIndex((z) => z + 1)
  //   }, [windows, nextZIndex])

  //   const closeWindow = useCallback((id: string) => {
  //     setWindows((prev) => prev.filter((w) => w.id !== id))
  //   }, [])

  //   const focusWindow = useCallback((id: string) => {
  //     setWindows((prev) =>
  //       prev.map((w) =>
  //         w.id === id ? { ...w, zIndex: nextZIndex } : w
  //       )
  //     )
  //     setNextZIndex((z) => z + 1)
  //   }, [nextZIndex])

  //   const minimizeWindow = useCallback((id: string) => {
  //     setWindows((prev) =>
  //       prev.map((w) =>
  //         w.id === id ? { ...w, isMinimized: true } : w
  //       )
  //     )
  //   }, [])

  //   const handleWindowClick = useCallback((id: string) => {
  //     const window = windows.find((w) => w.id === id)
  //     if (window?.isMinimized) {
  //       setWindows((prev) =>
  //         prev.map((w) =>
  //           w.id === id
  //             ? { ...w, isMinimized: false, zIndex: nextZIndex }
  //             : w
  //         )
  //       )
  //       setNextZIndex((z) => z + 1)
  //     } else {
  //       focusWindow(id)
  //     }
  //   }, [windows, focusWindow, nextZIndex])

  //   const activeWindowId = [...windows]
  //     .filter((w) => !w.isMinimized)
  //     .sort((a, b) => b.zIndex - a.zIndex)[0]?.id

  return (
    <main
      className="relative w-screen h-screen text-text bg-background p-2 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/wallpaper.jpg')" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* WINDOWS */}
      <Window
        {...(WINDOWS.find((w) => w.id === "wallpaper") as WindowProps)}
        isActive
      >
        <Suspense fallback={<WindowLoader />}>
          <WallpaperApp />
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
