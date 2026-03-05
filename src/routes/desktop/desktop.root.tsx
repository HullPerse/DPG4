import { APPS, WINDOWS } from "@/config/apps.config";
import AppDesktop from "./components/app.desktop";
import { Bell, DoorOpen, Image, Languages } from "lucide-react";
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
    <main className="flex flex-col w-full h-full">
      <section className="relative flex flex-1">
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

        {openCalendar && (
          <CalendarDesktop
            openCalendar={openCalendar}
            setOpenCalendar={setOpenCalendar}
            setOpenLanguage={setOpenLanguage}
          />
        )}

        {openLanguage && <FontDesktop />}
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
              <ContextDesktop
                key={app.id}
                app={app}
                activeApps={activeApps}
                setActiveApps={setActiveApps}
              />
            ))}
        </div>
        <div className="flex flex-row items-center h-full gap-2 border-l-2 border-highlight-high pl-2">
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

            {/* LANGUAGE */}
            <Languages
              className="w-4 h-4 hover:text-text cursor-pointer"
              onClick={() => {
                setOpenLanguage(!openLanguage);
              }}
            />

            {/* SIGNOUT */}
            <DoorOpen
              className="w-4 h-4 hover:text-text cursor-pointer"
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
