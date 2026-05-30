import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box, Button, Paper, Typography } from "@mui/material";
import { adminFetch } from "../adminApi";

type CellRow = {
  id: string;
  type: string;
  number: number;
  title: string;
  cellType: string;
  ladderTo: number;
  snakeTo: number;
};

export function CellsBoardPage() {
  const navigate = useNavigate();
  const [cells, setCells] = useState<CellRow[]>([]);

  useEffect(() => {
    adminFetch<{ data: CellRow[] }>(
      "/api/admin/data/cells?_perPage=200&_sort=number&_order=ASC",
    ).then((r) => setCells(r.data));
  }, []);

  const { start, final, grid } = useMemo(() => {
    const start = cells.find((c) => c.type === "start");
    const final = cells.find((c) => c.number === 101);
    const other = cells
      .filter((c) => c.type !== "start" && c.number !== 101)
      .sort((a, b) => a.number - b.number);
    const grid: CellRow[][] = [];
    for (let i = 0; i < 10; i++) {
      const row = other.slice(i * 10, (i + 1) * 10);
      grid.push(i % 2 === 1 ? [...row].reverse() : row);
    }
    return { start, final, grid };
  }, [cells]);

  const cellStyle = (cell: CellRow): React.CSSProperties => {
    const isLadder = cell.ladderTo > 0;
    const isSnake = cell.snakeTo > 0;
    return {
      width: 72,
      minHeight: 56,
      padding: 4,
      borderRadius: 6,
      border: "1px solid #cbd5e1",
      background: isLadder ? "#ecfdf5" : isSnake ? "#fef2f2" : "#fff",
      cursor: "pointer",
      fontSize: 10,
      lineHeight: 1.2,
    };
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Поле (tabletop)
      </Typography>
      <Button component={Link} to="/" size="small" sx={{ mb: 2 }}>
        ← На главную
      </Button>
      <Button
        component={Link}
        to="/cells"
        size="small"
        sx={{ mb: 2, ml: 1 }}
      >
        Таблица cells
      </Button>
      <Button
        component={Link}
        to="/rules"
        size="small"
        sx={{ mb: 2, ml: 1 }}
      >
        Правила
      </Button>

      <Paper sx={{ p: 2, overflow: "auto" }}>
        {start && (
          <Box
            sx={{ mb: 1 }}
            onClick={() => navigate(`/cells/${start.id}/show`)}
            style={cellStyle(start)}
          >
            <strong>START</strong>
            <div>{start.title || start.cellType}</div>
          </Box>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {grid.map((row, ri) => (
            <Box key={ri} sx={{ display: "flex", gap: 0.5 }}>
              {row.map((cell) => (
                <Box
                  key={cell.id}
                  onClick={() => navigate(`/cells/${cell.id}/show`)}
                  style={cellStyle(cell)}
                  title={cell.id}
                >
                  <strong>#{cell.number}</strong>
                  <div>{cell.title || cell.cellType || "—"}</div>
                  {cell.ladderTo > 0 && <div>↑{cell.ladderTo}</div>}
                  {cell.snakeTo > 0 && <div>↓{cell.snakeTo}</div>}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
        {final && (
          <Box
            sx={{ mt: 1 }}
            onClick={() => navigate(`/cells/${final.id}/show`)}
            style={cellStyle(final)}
          >
            <strong>FINISH</strong>
            <div>{final.title || final.cellType}</div>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
