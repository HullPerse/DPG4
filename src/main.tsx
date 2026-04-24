import { StrictMode } from "react";
import "@/index.css";

import { router } from "@/routes/__root";
import { RouterProvider } from "@tanstack/react-router";
import { initializeAuthStore } from "./store/user.store";
import { initializeFontStore } from "./store/data.store";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { QueryConfig } from "@/config/query.config";
import { ToastContainer } from "./components/ui/toast.component";
import {
  initActivitySubscription,
  initChatSubscription,
} from "./lib/activity.utils";

const queryClient = new QueryClient(QueryConfig);

await import("react-dom/client").then(async ({ createRoot }) => {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");

  await initializeAuthStore();
  await initializeFontStore();
  await initActivitySubscription();
  await initChatSubscription();

  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ToastContainer />
      </QueryClientProvider>
    </StrictMode>,
  );
});
