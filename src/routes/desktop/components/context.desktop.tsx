import { WindowProps } from "@/types/window";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context.component";
import { DIRECTIONS, WINDOWS } from "@/config/apps.config";
import {
  activeWindow,
  closeWindow,
  minimizeWindow,
  moveWindow,
  pinWindow,
  unminimizeWindow,
} from "@/lib/window.utils";
import {
  Activity,
  Maximize,
  Minimize,
  Move,
  Pin,
  PinOff,
  X,
} from "lucide-react";

export default function ContextDesktop({
  app,
  activeApps,
  setActiveApps,
}: {
  app: WindowProps;
  activeApps: WindowProps[];
  setActiveApps: (value: WindowProps[]) => void;
}) {
  return (
    <ContextMenu key={app.id}>
      <ContextMenuTrigger>
        <button
          className={`relative ${app.isMinimized ? "text-muted/50" : "text-muted"} hover:text-text cursor-pointer border rounded p-1`}
          title={app.title}
          onClick={() => setActiveApps(unminimizeWindow(activeApps, app.id))}
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
              onClick={() => setActiveApps(activeWindow(activeApps, app.id))}
            >
              <Activity /> Сдеать активным
            </ContextMenuItem>
          )}
          <ContextMenuItem
            onClick={() => setActiveApps(pinWindow(activeApps, app.id))}
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
                return setActiveApps(unminimizeWindow(activeApps, app.id));
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
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Move />
              Переместить
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="ml-2">
              <ContextMenuGroup>
                {DIRECTIONS.map((direction) => (
                  <ContextMenuItem
                    key={direction.direction}
                    onClick={() => {
                      setActiveApps(
                        moveWindow(activeApps, app.id, direction.direction),
                      );
                    }}
                  >
                    {direction.icon} {direction.label}
                  </ContextMenuItem>
                ))}
              </ContextMenuGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem
            onClick={() => setActiveApps(closeWindow(activeApps, app.id))}
          >
            <X /> Закрыть
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}
