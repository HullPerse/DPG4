import { APPS, WINDOWS } from "@/config/apps.config";
import AppDesktop from "./components/app.desktop";
import { DoorOpen, Image, Languages } from "lucide-react";
import Timer from "./components/timer.desktop";
import { WindowProps } from "@/types/window";
import { useUserStore } from "@/store/user.store";
import { AppProps } from "@/types/desktop";
import { createWindow } from "@/lib/window.utils";

import { lazy, useState } from "react";
import NetworkConnection from "@/components/shared/network.component";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover.component";

import NetworkHover from "./components/network.desktop";
import CalendarDesktop from "./components/calendar.desktop";
import FontDesktop from "./components/font.desktop";
import ContextDesktop from "./components/context.desktop";

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
  const setLoggedIn = useUserStore((state) => state.setLoggedIn);

  const [openCalendar, setOpenCalendar] = useState<boolean>(false);
  const [openLanguage, setOpenLanguage] = useState<boolean>(false);

  return (
    <main className="flex h-full w-full flex-col">
      <section className="relative flex flex-1">
        <div className="absolute top-6 left-6 grid grid-cols-1 gap-2">
          {APPS.sort((a, b) => a.priority - b.priority).map((app: AppProps) => (
            <AppDesktop
              key={app.name}
              label={app.label}
              name={app.name}
              icon={app.icon}
              link={app.link ?? null}
              component={app.component}
              activeApps={activeApps}
              setActiveApps={setActiveApps}
              isOpening={isOpening}
              setIsOpening={setIsOpening}
            />
          ))}
        </div>

        {openCalendar && (
          <CalendarDesktop
            openCalendar={openCalendar}
            setOpenCalendar={setOpenCalendar}
            setOpenLanguage={setOpenLanguage}
          />
        )}

        {openLanguage && <FontDesktop />}
      </section>

      <section className="flex h-14 w-full flex-row items-center justify-between border-t-2 border-t-highlight-high bg-background">
        <div className="flex h-full w-full flex-row items-center gap-2 overflow-x-auto px-2">
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
              <ContextDesktop
                key={app.id}
                app={app}
                activeApps={activeApps}
                setActiveApps={setActiveApps}
              />
            ))}
        </div>
        <div className="flex h-full flex-row items-center gap-2 border-l-2 border-highlight-high pl-2">
          <div className="flex items-center gap-2 text-muted">
            {/* NETWORK */}
            <HoverCard>
              <HoverCardTrigger>
                <NetworkConnection />
              </HoverCardTrigger>
              <HoverCardContent>
                <NetworkHover />
              </HoverCardContent>
            </HoverCard>

            {/* WALLAPAPER */}
            <Image
              className="h-4 w-4 cursor-pointer hover:text-iris"
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

            {/* LANGUAGE */}
            <Languages
              className="h-4 w-4 cursor-pointer hover:text-iris"
              onClick={() => {
                setOpenLanguage(!openLanguage);
              }}
            />

            {/* SIGNOUT */}
            <DoorOpen
              className="h-4 w-4 cursor-pointer hover:text-iris"
              onClick={() => {
                setLoggedIn(false);
              }}
            />
          </div>

          {/* TIME DATE */}
          <Timer
            onClick={() => {
              setOpenCalendar((value) => !value);
              setOpenLanguage(false);
            }}
          />
        </div>
      </section>
    </main>
  );
}
