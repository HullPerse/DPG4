import { APPS, WINDOWS } from "@/config/apps.config";
import AppDesktop from "./components/app.desktop";
import {
  Activity,
  Bell,
  DoorOpen,
  Image,
  Maximize,
  Minimize,
  Pin,
  PinOff,
  X,
} from "lucide-react";
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
  pinWindow,
} from "@/lib/window.utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context.component";
import { lazy } from "react";
import NetworkConnection from "@/components/shared/network.component";

const WallpaperApp = lazy(() => import("./apps/wallpaper.app"));

export default function Desktop({
  activeApps,
  setActiveApps,
  setWallpaper,
  isOpening,
  setIsOpening,
}: {
  activeApps: WindowProps[];
  setActiveApps: (value: WindowProps[]) => void;
  setWallpaper: (value: string | null) => void;
  isOpening: boolean;
  setIsOpening: (value: boolean) => void;
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
              component={app.component}
              activeApps={activeApps}
              setActiveApps={setActiveApps}
              isOpening={isOpening}
              setIsOpening={setIsOpening}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-row w-full bg-card items-center justify-between border-t-2 border-t-highlight-high h-14">
        <div className="flex flex-row items-center h-full px-2 gap-2 overflow-x-auto w-full">
          {[...activeApps]
            .sort((a, b) => {
              if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
                return (
                  Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))
                );
              }
              return (
                (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
              );
            })
            .map((app) => (
              <ContextMenu key={app.id}>
                <ContextMenuTrigger>
                  <button
                    className={`relative ${app.isMinimized ? "text-muted/50" : "text-muted"} hover:text-text cursor-pointer border rounded p-1`}
                    title={app.title}
                    onClick={() =>
                      setActiveApps(unminimizeWindow(activeApps, app.id))
                    }
                  >
                    {WINDOWS.find((w) => w.id === app.id)?.icon}

                    {/* pinned */}
                    {app.isPinned && (
                      <Pin className="absolute -top-1 -left-1 rotate-45 text-primary/60 size-4" />
                    )}
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-42">
                  <ContextMenuGroup>
                    {!app.isActive && (
                      <ContextMenuItem
                        onClick={() =>
                          setActiveApps(activeWindow(activeApps, app.id))
                        }
                      >
                        <Activity /> Сдеать активным
                      </ContextMenuItem>
                    )}
                    <ContextMenuItem
                      onClick={() =>
                        setActiveApps(pinWindow(activeApps, app.id))
                      }
                    >
                      {app.isPinned ? (
                        <>
                          <PinOff />
                          Открепить
                        </>
                      ) : (
                        <>
                          <Pin />
                          Закрепить
                        </>
                      )}
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
        <div className="flex flex-row items-center h-full gap-2 border-l-2 border-highlight-high pl-2">
          <div className="flex items-center gap-2 text-muted">
            {/* NETWORK */}
            <NetworkConnection />

            {/* NOTIFICATIONS */}
            <Bell className="w-4 h-4 hover:text-text cursor-pointer" />

            {/* WALLAPAPER */}
            <Image
              className="w-4 h-4 hover:text-text cursor-pointer"
              onClick={() =>
                setActiveApps(
                  createWindow(
                    activeApps,
                    WINDOWS.find((w) => w.id === "wallpaper") as WindowProps,
                    <WallpaperApp setWallpaper={setWallpaper} />,
                  ),
                )
              }
            />

            {/* SIGNOUT */}
            <DoorOpen
              className="w-4 h-4 hover:text-text cursor-pointer"
              onClick={logout}
            />
          </div>

          {/* TIME DATE */}
          <Timer />
        </div>
      </section>
    </main>
  );
}
