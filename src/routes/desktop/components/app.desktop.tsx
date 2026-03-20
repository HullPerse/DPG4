import { WINDOWS } from "@/config/apps.config";
import { createWindow } from "@/lib/window.utils";
import { AppProps } from "@/types/desktop";
import { WindowProps } from "@/types/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { memo } from "react";

function AppDesktop({
  name,
  label,
  icon,
  link,
  component,
  activeApps,
  setActiveApps,
  isOpening,
  setIsOpening,
}: AppProps & {
  activeApps: WindowProps[];
  setActiveApps: (value: WindowProps[]) => void;
  isOpening: boolean;
  setIsOpening: (value: boolean) => void;
}) {
  return (
    <button
      key={name}
      className="flex h-20 w-20 flex-col items-center justify-center rounded border-2 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] hover:bg-primary/20"
      style={{
        cursor: isOpening ? "wait" : "pointer",
      }}
      onDoubleClick={() => {
        if (link) return openUrl(link);
        if (!activeApps.find((item) => item.id === name)) setIsOpening(true);

        setActiveApps(
          createWindow(
            activeApps,
            WINDOWS.find((w) => w.id === name) as WindowProps,
            component,
          ),
        );

        return setTimeout(() => setIsOpening(false), 1000);
      }}
    >
      {icon}
      <span className="text-center text-xs leading-tight font-bold text-text">
        {label}
      </span>
    </button>
  );
}

export default memo(AppDesktop);
