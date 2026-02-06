import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { router } from "@/routes/__root";
import { RouterProvider } from "@tanstack/react-router";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
