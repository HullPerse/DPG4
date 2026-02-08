import { APPS } from "@/config/apps.config";
import AppDesktop from "./components/app.desktop";
import { Button } from "@/components/ui/button.component";
import { Edit } from "lucide-react";
import Timer from "./components/timer.desktop";
import { WindowProps } from "@/types/window";

export default function Desktop({ activeApps }: { activeApps: WindowProps[] }) {
  return (
    <main className="relative flex flex-col w-full h-full">
      <section className="flex flex-1">
        <div className="absolute top-6 left-6 grid grid-cols-1 gap-2">
          {APPS.map((app) => (
            <AppDesktop
              key={app.name}
              label={app.label}
              name={app.name}
              icon={app.icon}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-row w-full bg-card items-center justify-between border-t-2 border-t-highlight-high h-14">
        <div className="flex flex-row items-center h-full px-2"></div>
        <div className="flex flex-row items-center h-full">
          {/* WALLAPAPER */}
          <Button variant="link" className="text-muted">
            <Edit className="size-7" />
          </Button>

          {/* TIME DATE */}
          <Timer />
        </div>
      </section>
    </main>
  );
}
