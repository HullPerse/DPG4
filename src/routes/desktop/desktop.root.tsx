import { APPS, WINDOWS } from "@/config/apps.config";
import AppDesktop from "./components/app.desktop";
import { Activity, DoorOpen, Image, Maximize, Minimize, X } from "lucide-react";
import Timer from "./components/timer.desktop";
import { WindowProps } from "@/types/window";
import { useUserStore } from "@/store/user.store";
import { AppProps } from "@/types/desktop";
import {
  activeWindow,
  closeWindow,
  createWindow,
  minimizeWindow,
  unminimizeWindow,
} from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context.component";
import { lazy } from "react";

const WallpaperApp = lazy(() => import("./apps/wallpaper.app"));

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
        <div className="flex flex-row items-center h-full px-2">
          {activeApps.map((app) => (
            <ContextMenu key={app.id}>
              <ContextMenuTrigger>
                <button
                  className="text-muted hover:text-text cursor-pointer border rounded p-1"
                  title={app.title}
                  onClick={() =>
                    setActiveApps(unminimizeWindow(activeApps, app.id))
                  }
                >
                  {WINDOWS.find((w) => w.id === app.id)?.icon}
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuGroup>
                  <ContextMenuItem
                    onClick={() =>
                      setActiveApps(activeWindow(activeApps, app.id))
                    }
                  >
                    <Activity /> Сдеать активным
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => {
                      if (app.isMinimized) {
                        return setActiveApps(
                          unminimizeWindow(activeApps, app.id),
                        );
                      }

                      setActiveApps(minimizeWindow(activeApps, app.id));
                    }}
                  >
                    {app.isMinimized ? (
                      <>
                        <Maximize />
                        Развернуть
                      </>
                    ) : (
                      <>
                        <Minimize />
                        Свернуть
                      </>
                    )}
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      setActiveApps(closeWindow(activeApps, app.id))
                    }
                  >
                    <X /> Закрыть
                  </ContextMenuItem>
                </ContextMenuGroup>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
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
