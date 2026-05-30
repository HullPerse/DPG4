import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
  alpha,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import GridViewIcon from "@mui/icons-material/GridView";
import { adminFetch } from "../adminApi";
import { palette } from "../theme";
import type { AdminSchema } from "../types";

export function Dashboard({ schema }: { schema: AdminSchema }) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    adminFetch<{ counts: Record<string, number> }>("/api/admin/stats")
      .then((r) => setCounts(r.counts))
      .catch(() => setCounts(null));
  }, []);

  const handleBroadcast = async () => {
    setBroadcasting(true);
    setMessage("");
    try {
      await adminFetch("/api/admin/broadcast-reload", { method: "POST" });
      setMessage("Сигнал отправлен: клиенты обновят данные и сбросят кэши.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200 }}>
      <Typography
        variant="overline"
        sx={{ color: palette.textMuted, letterSpacing: "0.12em", mb: 0.5 }}
      >
        DPG · панель управления
      </Typography>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          mb: 1,
          background: `linear-gradient(135deg, ${palette.text} 0%, ${palette.primary} 100%)`,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        Админка
      </Typography>
      <Typography sx={{ color: palette.textMuted, mb: 4, maxWidth: 520 }}>
        Управление базой и инструменты для живой сессии.
      </Typography>

      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={handleBroadcast}
          disabled={broadcasting}
        >
          {broadcasting ? "Отправка…" : "Обновить всех игроков"}
        </Button>
        <Button
          component={Link}
          to="/grant-item"
          variant="outlined"
          startIcon={<CardGiftcardIcon />}
        >
          Выдать предмет
        </Button>
        <Button
          component={Link}
          to="/cells-board"
          variant="outlined"
          startIcon={<GridViewIcon />}
        >
          Поле (cells)
        </Button>
      </Box>

      {message && (
        <Paper
          sx={{
            px: 2,
            py: 1.5,
            mb: 3,
            bgcolor: alpha(palette.success, 0.1),
            borderColor: alpha(palette.success, 0.35),
          }}
        >
          <Typography variant="body2" sx={{ color: palette.success }}>
            {message}
          </Typography>
        </Paper>
      )}

      {!counts ? (
        <CircularProgress size={28} sx={{ color: palette.primary }} />
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
            gap: 1.5,
          }}
        >
          {Object.entries(schema.tables).map(([key, meta]) => (
            <Paper
              key={key}
              component={Link}
              to={`/${key}`}
              elevation={0}
              sx={{
                p: 2,
                textDecoration: "none",
                color: "inherit",
                display: "block",
                transition: "transform 0.15s, border-color 0.15s",
                "&:hover": {
                  transform: "translateY(-2px)",
                  borderColor: alpha(palette.primary, 0.4),
                },
              }}
            >
              <Typography variant="body2" sx={{ color: palette.textMuted }}>
                {meta.label}
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: palette.primary, mt: 1 }}
              >
                {counts[key] ?? 0}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
}
