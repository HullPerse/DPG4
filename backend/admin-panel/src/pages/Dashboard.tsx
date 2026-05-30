import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, CircularProgress } from "@mui/material";
import { adminFetch } from "../adminApi";
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
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>
        DPG Admin
      </h1>
      <p style={{ color: "#64748b", marginBottom: 24 }}>
        Управление базой и инструменты для живой сессии.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
        <Button
          variant="contained"
          onClick={handleBroadcast}
          disabled={broadcasting}
        >
          {broadcasting ? "Отправка…" : "Обновить всех игроков"}
        </Button>
        <Button component={Link} to="/grant-item" variant="outlined">
          Выдать предмет
        </Button>
        <Button component={Link} to="/cells-board" variant="outlined">
          Поле (cells)
        </Button>
      </div>
      {message && (
        <p style={{ color: "#059669", marginBottom: 24, fontSize: 14 }}>{message}</p>
      )}

      {!counts ? (
        <CircularProgress size={28} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          {Object.entries(schema.tables).map(([key, meta]) => (
            <Link
              key={key}
              to={`/${key}`}
              style={{
                padding: 16,
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #e2e8f0",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 15 }}>{meta.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#2563eb", marginTop: 8 }}>
                {counts[key] ?? 0}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
