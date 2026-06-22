import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { adminFetch } from "@/adminApi";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchemaProvider } from "@/context/SchemaContext";
import { AdminShell } from "@/layout/AdminShell";
import { CellsBoardPage } from "@/pages/CellsBoard";
import { ConsolePage } from "@/pages/Console";
import { Dashboard } from "@/pages/Dashboard";
import { GrantItemPage } from "@/pages/GrantItem";
import { HealthPage } from "@/pages/Health";
import { LogsPage } from "@/pages/Logs";
import { SearchPage } from "@/pages/Search";
import { LoginPage } from "@/pages/Login";
import { ResourceFormPage } from "@/pages/ResourceForm";
import { ResourceListPage } from "@/pages/ResourceList";
import { ResourceShowPage } from "@/pages/ResourceShow";
import type { AdminSchema } from "@/types";

export function App() {
  const [schema, setSchema] = useState<AdminSchema | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<AdminSchema>("/api/admin/schema")
      .then(setSchema)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load schema"),
      );
  }, []);

  if (error) {
    return (
      <div className="text-love bg-background h-full overflow-y-auto p-8">
        Не удалось загрузить схему: {error}
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="bg-background flex h-full items-center justify-center">
        <Loader2 className="text-primary size-8 animate-spin" />
        <span className="text-muted ml-3 text-sm">Загрузка схемы…</span>
      </div>
    );
  }

  return (
    <SchemaProvider schema={schema}>
      <BrowserRouter basename="/admin">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminShell schema={schema} />}>
              <Route index element={<Dashboard schema={schema} />} />
              <Route path="grant-item" element={<GrantItemPage />} />
              <Route path="health" element={<HealthPage />} />
              <Route path="cells-board" element={<CellsBoardPage />} />
              <Route path="console" element={<ConsolePage />} />
              <Route path="logs" element={<LogsPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path=":resource/create" element={<ResourceFormPage mode="create" />} />
              <Route
                path=":resource/:id/edit"
                element={<ResourceFormPage mode="edit" />}
              />
              <Route path=":resource/:id" element={<ResourceShowPage />} />
              <Route path=":resource" element={<ResourceListPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SchemaProvider>
  );
}
