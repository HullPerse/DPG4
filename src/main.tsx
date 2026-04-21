import { StrictMode } from "react";
import "@/index.css";

import { router } from "@/routes/__root";
import { RouterProvider } from "@tanstack/react-router";
import { initializeAuthStore } from "./store/user.store";
import { initializeFontStore } from "./store/data.store";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { QueryConfig } from "@/config/query.config";
import { ToastContainer } from "./components/ui/toast.component";
import { initActivitySubscription, initChatSubscription } from "./lib/activity.utils";

const queryClient = new QueryClient(QueryConfig);

async function checkForUpdates() {
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (update) {
      await update.downloadAndInstall();
    }
  } catch (e) {
    console.debug("Auto-update check skipped:", e);
  }
}

await import("react-dom/client").then(async ({ createRoot }) => {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");

  await initializeAuthStore();
  await initializeFontStore();
  await initActivitySubscription();
  await initChatSubscription();
  await checkForUpdates();

  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ToastContainer />
      </QueryClientProvider>
    </StrictMode>,
  );
});
