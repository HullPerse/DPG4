import { APPS } from "@/config/apps.config";
import AppDesktop from "./components/app.desktop";

export default function Desktop() {
  return (
    <main className="absolute top-6 left-6 grid grid-cols-1 gap-2">
      {APPS.map((app) => (
        <AppDesktop
          key={app.name}
          label={app.label}
          name={app.name}
          icon={app.icon}
        />
      ))}
    </main>
  );
}
