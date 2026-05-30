import { StrictMode } from "react";
import "@/index.css";

import { router } from "@/routes/__root";
import { RouterProvider } from "@tanstack/react-router";
import { initializeAuthStore } from "./store/user.store";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { QueryConfig } from "@/config/query.config";
import { ToastContainer } from "./components/ui/toast.component";

const queryClient = new QueryClient(QueryConfig);

await import("react-dom/client").then(async ({ createRoot }) => {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");

  await initializeAuthStore();

  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ToastContainer />
      </QueryClientProvider>
    </StrictMode>,
  );
});
