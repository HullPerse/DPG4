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
  setActiveApps,
}: {
  app: WindowProps;
  setActiveApps: React.Dispatch<React.SetStateAction<WindowProps[]>>;
}) {
  return (
    <ContextMenu key={app.id}>
      <ContextMenuTrigger>
        <button
          role="button"
          className={`relative ${app.isMinimized ? "text-muted/50" : "text-muted"} cursor-pointer rounded border p-1 hover:text-text`}
          title={app.title}
          onClick={() =>
            setActiveApps((prev) => unminimizeWindow(prev, app.id))
          }
        >
          {WINDOWS.find((w) => w.id === app.id)?.icon}

          {/* pinned */}
          {app.isPinned && (
            <Pin className="absolute -top-1 -left-1 size-4 rotate-45 text-primary/60" />
          )}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-42">
        <ContextMenuGroup>
          {!app.isActive && (
            <ContextMenuItem
              onClick={() =>
                setActiveApps((prev) => activeWindow(prev, app.id))
              }
            >
              <Activity /> Сдеать активным
            </ContextMenuItem>
          )}
          <ContextMenuItem
            onClick={() => setActiveApps((prev) => pinWindow(prev, app.id))}
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
                return setActiveApps((prev) => unminimizeWindow(prev, app.id));
              }

              setActiveApps((prev) => minimizeWindow(prev, app.id));
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
                      setActiveApps((prev) =>
                        moveWindow(prev, app.id, direction.direction),
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
            onClick={() => setActiveApps((prev) => closeWindow(prev, app.id))}
          >
            <X /> Закрыть
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
}
