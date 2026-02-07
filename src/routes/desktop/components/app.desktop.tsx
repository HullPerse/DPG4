import { AppProps } from "@/types/desktop";
import { memo } from "react";

function AppDesktop({ name, label, icon }: AppProps) {
  return (
    <button
      key={name}
      onDoubleClick={() => console.log("double click")}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-card/50 transition-all duration-200 group w-20"
    >
      <div className="p-3 rounded-xl bg-card/60 backdrop-blur-sm group-hover:bg-card/80 transition-colors">
        {icon}
      </div>
      <span className="text-xs font-medium text-foreground/90 text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

export default memo(AppDesktop);
