import { useUserStore } from "./store/user.store";
import { useNavigate } from "@tanstack/react-router";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Desktop from "./routes/desktop/desktop.root";
import { WindowProps } from "./types/window";
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
import Signpout from "./routes/auth/components/signout.component";
import { checkForUpdates, installUpdate, selectionMouse } from "./lib/utils";
import Window from "./components/shared/window.component";
import { WindowLoader } from "./components/shared/loader.component";
import { useToastStore } from "./store/toast.store";
import { UpdateData } from "./types/activity";
import { Download } from "lucide-react";

const dataURLtoBlob = (dataURL: string): Blob => {
  const [header, data] = dataURL.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch?.[1] || "application/octet-stream";
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
};

function App() {
  //routing
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  //stores
  const wallpaperData = useDataStore((state) => state.wallpaper);
  const wallpaperFilters = useDataStore((state) => state.wallpaperFilters);
  const isAuth = useUserStore((state) => state.isAuth);
  const loggedIn = useUserStore((state) => state.loggedIn);

  //compute combined CSS filter from individual values for wallpaper only
  const wallpaperFilter = (() => {
    const filters = [];
    if (wallpaperFilters.brightness !== 100)
      filters.push(`brightness(${wallpaperFilters.brightness}%)`);
    if (wallpaperFilters.contrast !== 100)
      filters.push(`contrast(${wallpaperFilters.contrast}%)`);
    if (wallpaperFilters.saturate !== 100)
      filters.push(`saturate(${wallpaperFilters.saturate}%)`);
    if (wallpaperFilters.blur > 0)
      filters.push(`blur(${wallpaperFilters.blur}px)`);
    if (wallpaperFilters.hueRotate > 0)
      filters.push(`hue-rotate(${wallpaperFilters.hueRotate}deg)`);
    if (wallpaperFilters.filter !== "none")
      filters.push(wallpaperFilters.filter);
    return filters.length > 0 ? filters.join(" ") : "none";
  })();

  //app states
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [activeApps, setActiveApps] = useState<WindowProps[]>([]);
  const [isOpening, setIsOpening] = useState<boolean>(false);

  //selection states
  const desktopRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  const selectionStartRef = useRef({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);

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

      const target = e.target as HTMLElement;

      //check if mouse is over any window
      const windowElement = target.closest('[data-window="true"]');
      if (windowElement) return;

      //check if mouse over calendar
      const calendarElement = target.closest('[data-calendar="true"]');
      if (calendarElement) return;

      //check if mouse over font changer
      const fontElement = target.closest('[data-font="true"]');
      if (fontElement) return;

      selectionStartRef.current = { x, y };
      setIsSelecting(true);
    },
    [],
  );

  const handleUpdates = useCallback(async () => {
    try {
      const update = await checkForUpdates();
      if (!update) return;

      const toastData: UpdateData = {
        id: "update",
        author: "System",
        image: "⚠️",
        type: "emoji",
        text: `Версия ${update.version} доступна для скачивания`,
        created: new Date().toISOString(),
        timeout: Infinity,
        showClose: true,
        onClick: {
          fn: () => installUpdate(update),
          icon: <Download className="size-4" />,
        },
      };

      addToast(toastData);
    } catch (e) {
      console.error("Failed to check for updates:", e);
    }
  }, [addToast]);

  useEffect(() => {
    handleUpdates();
  }, []);

  useEffect(() => {
    if (!isSelecting) return;

    const handleMouseMove = (e: MouseEvent) =>
      selectionMouse(e, desktopRef, selectionRef, selectionStartRef);

    const handleMouseUp = () => setIsSelecting(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isSelecting]);

  useEffect(() => {
    let mounted = true;
    let currentObjectUrl: string | null = null;

    const getWallpaper = async () => {
      try {
        const wallpaper = await invoke<string>("get_wallpaper_by_name", {
          name: wallpaperData,
        });
        const dataUrl = await invoke<string>("get_wallpaper_data", {
          path: wallpaper || "",
        });

        if (mounted && dataUrl) {
          if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
          }

          const blob = dataURLtoBlob(dataUrl);
          currentObjectUrl = URL.createObjectURL(blob);
          setWallpaper(currentObjectUrl);
        }
      } catch (e) {
        console.error(e);
      }
    };

    getWallpaper();

    return () => {
      mounted = false;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [wallpaperData]);

  //navigate to auth if user not logged in
  useEffect(() => {
    if (!isAuth) {
      navigate({
        to: `/auth`,
        replace: true,
      });
    }
  }, [isAuth, navigate]);

  if (!loggedIn) return <Signpout />;

  return (
    <main
      ref={desktopRef}
      className="relative h-screen w-screen overflow-hidden text-text select-none"
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={handleDesktopMouseDown}
    >
      {/* WALLPAPER */}
      <div
        className="absolute inset-0 z-0 bg-background bg-no-repeat"
        style={{
          backgroundImage: `url(${wallpaper})`,
          backgroundSize: wallpaperFilters.backgroundSize,
          backgroundPosition: wallpaperFilters.backgroundPosition,
          backgroundRepeat: wallpaperFilters.backgroundRepeat,
          filter: wallpaperFilter,
          cursor: isOpening ? "wait" : "default",
        }}
      />

      {/* CONTENT LAYER */}
      <div className="relative z-10 h-full w-full">
        {/* SELECTION */}
        <Selection ref={selectionRef} visible={isSelecting} />

        {/* WINDOWS */}
        {activeApps.map((app) => (
          <Window
            key={app.id}
            onMinimize={() => setActiveApps(minimizeWindow(activeApps, app.id))}
            onClose={() => setActiveApps(closeWindow(activeApps, app.id))}
            onActive={() => setActiveApps(activeWindow(activeApps, app.id))}
            onInactive={() =>
              setActiveApps(deactivateWindow(activeApps, app.id))
            }
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
      </div>
    </main>
  );
}

export default App;
