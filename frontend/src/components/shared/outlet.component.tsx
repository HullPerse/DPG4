import { Outlet } from "@tanstack/react-router";
import { useAppUpdates } from "@/hooks/useAppUpdates";

export default function OutletComponent() {
  useAppUpdates();

  return (
    <main className="h-screen w-screen bg-background text-text relative overflow-hidden">
      <Outlet />
    </main>
  );
}
