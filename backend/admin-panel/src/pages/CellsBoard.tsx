import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Box, Button, Paper, Typography, alpha } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { adminFetch } from "../adminApi";
import { palette } from "../theme";

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
      borderRadius: 8,
      border: `1px solid ${palette.border}`,
      background: isLadder
        ? alpha(palette.success, 0.12)
        : isSnake
          ? alpha(palette.error, 0.12)
          : palette.surfaceRaised,
      cursor: "pointer",
      fontSize: 10,
      lineHeight: 1.2,
      color: palette.text,
      transition: "border-color 0.15s, transform 0.15s",
    };
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Поле (tabletop)
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        <Button
          component={Link}
          to="/"
          size="small"
          startIcon={<ArrowBackIcon />}
          sx={{ color: palette.textMuted }}
        >
          На главную
        </Button>
        <Button component={Link} to="/cells" size="small" variant="outlined">
          Таблица cells
        </Button>
        <Button component={Link} to="/rules" size="small" variant="outlined">
          Правила
        </Button>
      </Box>

      <Paper sx={{ p: 2, overflow: "auto" }}>
        {start && (
          <Box
            sx={{ mb: 1 }}
            onClick={() => navigate(`/cells/${start.id}/show`)}
            style={{
              ...cellStyle(start),
              borderColor: alpha(palette.primary, 0.5),
            }}
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
            style={{
              ...cellStyle(final),
              borderColor: alpha(palette.primary, 0.5),
            }}
          >
            <strong>FINISH</strong>
            <div>{final.title || final.cellType}</div>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
