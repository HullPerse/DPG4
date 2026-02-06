import { APPS } from "@/config/apps.config";

export default function Desktop() {
  return (
    <main className="absolute top-6 left-6 grid grid-cols-1 gap-2">
      {APPS.map((app) => (
        <button
          key={app.name}
          onDoubleClick={() => console.log("double click")}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-card/50 transition-all duration-200 group w-20"
        >
          <div className="p-3 rounded-xl bg-card/60 backdrop-blur-sm group-hover:bg-card/80 transition-colors">
            {app.icon}
          </div>
          <span className="text-xs font-medium text-foreground/90 text-center leading-tight">
            {app.label}
          </span>
        </button>
      ))}
    </main>
  );
}
