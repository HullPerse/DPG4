import { useUserStore } from "./store/user.store";
import { useNavigate } from "@tanstack/react-router";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Desktop from "./routes/desktop/desktop.root";
import Window from "./components/shared/window.component";
import { WindowProps } from "./types/window";
import { WindowLoader } from "./components/shared/loader.component";
import { useDataStore } from "./store/data.store";
import { invoke } from "@tauri-apps/api/core";
import Selection from "./routes/desktop/components/selection.desktop";
import {
  activeWindow,
  closeWindow,
  deactivateWindow,
  minimizeWindow,
  refreshWindow,
} from "./lib/window.utils";
import Signpout from "./routes/desktop/components/signout.component";

function App() {
  //routing
  const navigate = useNavigate();

  //stores
  const wallpaperData = useDataStore((state) => state.wallpaper);
  const isAuth = useUserStore((state) => state.isAuth);
  const loggedIn = useUserStore((state) => state.loggedIn);

  //app states
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [activeApps, setActiveApps] = useState<WindowProps[]>([]);
  const [isOpening, setIsOpening] = useState<boolean>(false);

  //selection states
  const desktopRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });

  const handleDesktopMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;

      const rect = desktopRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      //prevent taskbar selection
      const taskbarHeight = 60;
      if (y > rect.height - taskbarHeight) return;

      // check if mouse is over any window
      const target = e.target as HTMLElement;
      const windowElement = target.closest('[data-window="true"]');
      if (windowElement) return;

      setSelectionStart({ x, y });
      setSelectionEnd({ x, y });
      setIsSelecting(true);
    },
    [],
  );

  useEffect(() => {
    if (!isSelecting) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = desktopRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const taskbarHeight = 56;
      const maxY = rect.height - taskbarHeight;

      setSelectionEnd({
        x: Math.max(0, Math.min(x, rect.width)),
        y: Math.max(0, Math.min(y, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsSelecting(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isSelecting]);

  const selectionRect = {
    left: Math.min(selectionStart.x, selectionEnd.x),
    top: Math.min(selectionStart.y, selectionEnd.y),
    width: Math.abs(selectionEnd.x - selectionStart.x),
    height: Math.abs(selectionEnd.y - selectionStart.y),
  };

  //initialize wallpaper data
  const getWallpaper = async () => {
    const wallpaper = await invoke<string>("get_wallpaper_by_name", {
      name: wallpaperData,
    });

    const dataUrl = await invoke<string>("get_wallpaper_data", {
      path: wallpaper || "",
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

  if (!loggedIn) return <Signpout />;

  return (
    <main
      ref={desktopRef}
      className="relative w-screen h-screen text-text bg-background bg-cover bg-center bg-no-repeat select-none"
      style={{
        backgroundImage: `url(${wallpaper})`,
        cursor: isOpening ? "wait" : "default",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={handleDesktopMouseDown}
    >
      {/* SELECTION */}
      {isSelecting && selectionRect.width > 2 && selectionRect.height > 2 && (
        <Selection selectionRect={selectionRect} />
      )}

      {/* WINDOWS */}
      {activeApps.map((app) => (
        <Window
          key={app.id}
          onMinimize={() => setActiveApps(minimizeWindow(activeApps, app.id))}
          onClose={() => setActiveApps(closeWindow(activeApps, app.id))}
          onActive={() => setActiveApps(activeWindow(activeApps, app.id))}
          onInactive={() => setActiveApps(deactivateWindow(activeApps, app.id))}
          onRefresh={() => setActiveApps(refreshWindow(activeApps, app.id))}
          setIsOpening={setIsOpening}
          {...app}
        >
          <Suspense fallback={<WindowLoader />}>{app.children}</Suspense>
        </Window>
      ))}

      {/* DESKTOP */}
      <Desktop
        activeApps={activeApps}
        setActiveApps={setActiveApps}
        setWallpaper={setWallpaper}
        isOpening={isOpening}
        setIsOpening={setIsOpening}
      />
    </main>
  );
}

export default App;
