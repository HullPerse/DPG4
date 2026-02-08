import { APPS, WINDOWS } from "@/config/apps.config";
import AppDesktop from "./components/app.desktop";
import { DoorOpen, Image } from "lucide-react";
import Timer from "./components/timer.desktop";
import { WindowProps } from "@/types/window";
import { useUserStore } from "@/store/user.store";
import { AppProps } from "@/types/desktop";
import { createWindow } from "@/lib/utils";
import WallpaperApp from "./apps/wallpaper.app";

export default function Desktop({
  activeApps,
  setActiveApps,
  setWallpaper,
}: {
  activeApps: WindowProps[];
  setActiveApps: (value: WindowProps[]) => void;
  setWallpaper: (value: string | null) => void;
}) {
  const logout = useUserStore((state) => state.logout);

  return (
    <main className="relative flex flex-col w-full h-full">
      <section className="flex flex-1">
        <div className="absolute top-6 left-6 grid grid-cols-1 gap-2">
          {APPS.map((app: AppProps) => (
            <AppDesktop
              key={app.name}
              label={app.label}
              name={app.name}
              icon={app.icon}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-row w-full bg-card items-center justify-between border-t-2 border-t-highlight-high h-14">
        <div className="flex flex-row items-center h-full px-2"></div>
        <div className="flex flex-row items-center h-full gap-2">
          {/* WALLAPAPER */}
          <button
            className="text-muted hover:text-text cursor-pointer border rounded p-1"
            title="Сменить обои"
            onClick={() =>
              setActiveApps(
                createWindow(
                  activeApps,
                  WINDOWS.find((w) => w.id === "wallpaper") as WindowProps,
                  <WallpaperApp setWallpaper={setWallpaper} />,
                ),
              )
            }
          >
            <Image className="size-7" />
          </button>

          {/* SIGNOUT */}
          <button
            className="text-muted hover:text-text cursor-pointer border rounded p-1"
            onClick={logout}
            title="Выход"
          >
            <DoorOpen className="size-7" />
          </button>

          {/* TIME DATE */}
          <Timer />
        </div>
      </section>
    </main>
  );
}
