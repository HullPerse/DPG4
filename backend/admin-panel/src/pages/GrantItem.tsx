import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Autocomplete,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { adminFetch } from "../adminApi";
import { palette } from "../theme";

type Row = { id: string; username?: string; label?: string };

async function fetchRows(table: string): Promise<Row[]> {
  const { data } = await adminFetch<{ data: Row[] }>(
    `/api/admin/data/${table}?_perPage=200&_sort=id&_order=ASC`,
  );
  return data;
}

export function GrantItemPage() {
  const [users, setUsers] = useState<Row[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [userId, setUserId] = useState("");
  const [itemId, setItemId] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    void fetchRows("users").then(setUsers);
    void fetchRows("items").then(setItems);
  }, []);

  const submit = async () => {
    setStatus("");
    try {
      await adminFetch("/api/admin/grant-item", {
        method: "POST",
        body: JSON.stringify({ userId, itemId }),
      });
      setStatus("Предмет выдан.");
      setItemId("");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const statusColor =
    status && !status.includes("Ошибка") ? palette.success : palette.error;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 560 }}>
      <Button
        component={Link}
        to="/"
        size="small"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2, color: palette.textMuted }}
      >
        На главную
      </Button>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Выдать предмет
      </Typography>
      <Typography variant="body2" sx={{ color: palette.textMuted, mb: 3 }}>
        Добавляет запись в инвентарь выбранного игрока.
      </Typography>
      <Paper sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
        <Autocomplete
          options={users}
          getOptionLabel={(o) => `${o.username ?? o.id} (${o.id})`}
          onChange={(_, v) => setUserId(v?.id ?? "")}
          renderInput={(params) => <TextField {...params} label="Игрок" />}
        />
        <Autocomplete
          options={items}
          getOptionLabel={(o) => `${o.label ?? o.id} (${o.id})`}
          onChange={(_, v) => setItemId(v?.id ?? "")}
          renderInput={(params) => (
            <TextField {...params} label="Предмет (items)" />
          )}
        />
        <Button
          variant="contained"
          disabled={!userId || !itemId}
          onClick={() => void submit()}
        >
          Выдать в инвентарь
        </Button>
        {status && (
          <Typography variant="body2" sx={{ color: statusColor }}>
            {status}
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
