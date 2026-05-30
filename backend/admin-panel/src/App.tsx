import { useEffect, useState } from "react";
import {
  Admin,
  Resource,
  CustomRoutes,
  defaultTheme,
} from "react-admin";
import { createTheme } from "@mui/material/styles";
import { Route } from "react-router-dom";
import {
  People,
  SportsEsports,
  Bookmark,
  Inventory,
  Storefront,
  Timeline,
  Chat,
  Gavel,
  Campaign,
  Brush,
  GridOn,
} from "@mui/icons-material";
import { authProvider } from "./authProvider";
import { dataProvider } from "./dataProvider";
import { adminFetch } from "./adminApi";
import type { AdminSchema } from "./types";
import { createResourceNode } from "./createResources";
import { Dashboard } from "./pages/Dashboard";
import { GrantItemPage } from "./pages/GrantItem";
import { CellsBoardPage } from "./pages/CellsBoard";

const icons: Record<string, React.ReactNode> = {
  users: <People />,
  games: <SportsEsports />,
  presets: <Bookmark />,
  items: <Inventory />,
  inventory: <Inventory />,
  market: <Storefront />,
  activity: <Timeline />,
  chats: <Chat />,
  rules: <Gavel />,
  ads: <Campaign />,
  drawings: <Brush />,
  cells: <GridOn />,
};

const theme = createTheme({
  ...defaultTheme,
  palette: {
    ...defaultTheme.palette,
    primary: { main: "#2563eb" },
    mode: "light",
    background: { default: "#f1f5f9" },
  },
});

function AdminApp() {
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
      <div style={{ padding: 32, color: "#b91c1c" }}>
        Не удалось загрузить схему: {error}
      </div>
    );
  }

  if (!schema) {
    return (
      <div style={{ padding: 32, color: "#64748b" }}>Загрузка схемы…</div>
    );
  }

  return (
    <Admin
      authProvider={authProvider}
      dataProvider={dataProvider}
      dashboard={() => <Dashboard schema={schema} />}
      requireAuth
      theme={theme}
    >
      {Object.entries(schema.tables).map(([name, meta]) => {
        const views = createResourceNode(name, meta);
        return (
          <Resource
            key={name}
            name={name}
            options={{ label: meta.label }}
            icon={() => icons[name] ?? null}
            {...views}
          />
        );
      })}
      <CustomRoutes>
        <Route path="/grant-item" element={<GrantItemPage />} />
        <Route path="/cells-board" element={<CellsBoardPage />} />
      </CustomRoutes>
    </Admin>
  );
}

export function App() {
  return <AdminApp />;
}
