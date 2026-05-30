import { useEffect, useState } from "react";
import {
  Admin,
  Resource,
  CustomRoutes,
} from "react-admin";
import { Route } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
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
import { adminTheme, palette } from "./theme";

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

function LoadingScreen({ text }: { text: string }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        bgcolor: palette.bg,
        color: palette.textMuted,
      }}
    >
      <CircularProgress size={32} sx={{ color: palette.primary }} />
      <Typography variant="body2">{text}</Typography>
    </Box>
  );
}

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
      <Box
        sx={{
          p: 4,
          minHeight: "100vh",
          bgcolor: palette.bg,
          color: palette.error,
        }}
      >
        Не удалось загрузить схему: {error}
      </Box>
    );
  }

  if (!schema) {
    return <LoadingScreen text="Загрузка схемы…" />;
  }

  return (
    <Admin
      authProvider={authProvider}
      dataProvider={dataProvider}
      dashboard={() => <Dashboard schema={schema} />}
      requireAuth
      theme={adminTheme}
      title="DPG Admin"
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
