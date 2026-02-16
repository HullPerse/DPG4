import { WINDOWS } from "@/config/apps.config";
import { createWindow } from "@/lib/window.utils";
import { AppProps } from "@/types/desktop";
import { WindowProps } from "@/types/window";
import { memo } from "react";

function AppDesktop({
  name,
  label,
  icon,
  component,
  activeApps,
  setActiveApps,
}: AppProps & {
  activeApps: WindowProps[];
  setActiveApps: (value: WindowProps[]) => void;
}) {
  return (
    <button
      key={name}
      className="flex flex-col items-center justify-center hover:bg-primary/20 w-18 h-18 rounded cursor-pointer drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] border-2"
      onDoubleClick={() => {
        setActiveApps(
          createWindow(
            activeApps,
            WINDOWS.find((w) => w.id === name) as WindowProps,
            component,
          ),
        );
      }}
    >
      {icon}
      <span className="text-xs font-bold text-text text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

export default memo(AppDesktop);
