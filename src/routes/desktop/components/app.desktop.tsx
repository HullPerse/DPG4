import { AppProps } from "@/types/desktop";
import { memo } from "react";

function AppDesktop({ name, label, icon }: AppProps) {
  return (
    <button
      key={name}
      className="flex flex-col items-center justify-center bg-primary/20 w-18 h-18 border-2 rounded border-primary"
      onDoubleClick={() => console.log("double click")}
    >
      {icon}
      <span className="text-xs font-bold text-text text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

export default memo(AppDesktop);
