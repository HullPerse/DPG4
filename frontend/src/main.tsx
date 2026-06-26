import { StrictMode } from "react";
import "@/index.css";

import { router } from "@/routes/__root";
import { RouterProvider } from "@tanstack/react-router";
import { initializeAuthStore } from "./store/user.store";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { QueryConfig } from "@/config/query.config";
import { ToastContainer } from "./components/ui/toast.component";
import { ADMIN_RELOAD_EVENT } from "@/lib/reload.utils";
import { ErrorBoundary } from "./components/ui/boundary.error";
import { useToastStore } from "./store/toast.store";

const queryClient = new QueryClient(QueryConfig);

window.addEventListener(ADMIN_RELOAD_EVENT, () => {
  void queryClient.invalidateQueries();
});

window.addEventListener("unhandledrejection", (e) => {
  const msg = e.reason?.message ?? String(e.reason);
  useToastStore.getState().addToast({
    id: crypto.randomUUID(),
    author: "Ошибка",
    text: msg,
    type: "emoji",
    image: "⚠️",
    created: new Date().toISOString(),
  } as any);
});

await initializeAuthStore();

await import("react-dom/client").then(({ createRoot }) => {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");

  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <ToastContainer />
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
});
