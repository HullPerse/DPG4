import { Outlet } from "@tanstack/react-router";

export default function OutletComponent() {
  return (
    <main className="h-screen w-screen bg-background text-primary">
      <Outlet />
    </main>
  );
}
