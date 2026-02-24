import { startTransition, StrictMode } from "react";
import "./index.css";

import { router } from "@/routes/__root";
import { RouterProvider } from "@tanstack/react-router";
import { initializeAuthStore } from "./store/user.store";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { QueryConfig } from "@/config/query.config";

const queryClient = new QueryClient(QueryConfig);

await import("react-dom/client").then(async ({ createRoot }) => {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");

  await initializeAuthStore();

  startTransition(() => {
    createRoot(rootElement).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <TanStackDevtools
            plugins={[
              {
                name: "TanStack Query",
                render: <ReactQueryDevtoolsPanel />,
                defaultOpen: true,
              },
              {
                name: "TanStack Router",
                render: <TanStackRouterDevtoolsPanel />,
                defaultOpen: false,
              },
            ]}
          />
        </QueryClientProvider>
      </StrictMode>,
    );
  });
});
