import { useMemo, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import AddIcon from "@mui/icons-material/Add";
import { useInput } from "react-admin";
import type { AdminFieldMeta } from "../types";

function inferColumns(
  rows: Record<string, unknown>[],
  preferred?: string[],
): string[] {
  if (preferred?.length) return preferred;
  const first = rows[0];
  if (!first) return ["id", "name"];
  const keys = Object.keys(first);
  if (keys.includes("id") && keys.includes("name")) return ["id", "name", ...keys.filter((k) => k !== "id" && k !== "name")];
  return keys.slice(0, 6);
}

function normalizeRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) =>
    row && typeof row === "object" && !Array.isArray(row)
      ? { ...(row as Record<string, unknown>) }
      : { value: row },
  );
}

export function ObjectListInput({
  source,
  fieldMeta,
}: {
  source: string;
  fieldMeta: AdminFieldMeta;
}) {
  const { field } = useInput({ source });
  const rows = useMemo(() => normalizeRows(field.value), [field.value]);
  const columns = useMemo(
    () => inferColumns(rows, fieldMeta.objectListColumns),
    [rows, fieldMeta.objectListColumns],
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const commit = (next: Record<string, unknown>[]) => {
    field.onChange(next);
  };

  const updateCell = (rowIndex: number, col: string, value: string) => {
    const next = rows.map((r, i) => {
      if (i !== rowIndex) return r;
      const copy = { ...r };
      if (col === "id" && /^\d+$/.test(value)) {
        copy[col] = Number(value);
      } else {
        copy[col] = value;
      }
      return copy;
    });
    commit(next);
  };

  const addRow = () => {
    const blank: Record<string, unknown> = {};
    for (const col of columns) {
      blank[col] = col === "id" ? 0 : "";
    }
    commit([...rows, blank]);
  };

  const removeRow = (index: number) => {
    commit(rows.filter((_, i) => i !== index));
  };

  const onDragStart = (index: number) => setDragIndex(index);

  const onDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...rows];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    commit(next);
    setDragIndex(null);
  };

  return (
    <Box sx={{ mb: 2, width: "100%" }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        {source}
      </Typography>
      <Box sx={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              {columns.map((col) => (
                <TableCell key={col} sx={{ fontWeight: 600, fontSize: 12 }}>
                  {col}
                </TableCell>
              ))}
              <TableCell width={48} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                draggable
                onDragStart={() => onDragStart(rowIndex)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(rowIndex)}
                sx={{
                  bgcolor: dragIndex === rowIndex ? "#eff6ff" : undefined,
                }}
              >
                <TableCell>
                  <DragIndicatorIcon
                    fontSize="small"
                    sx={{ color: "#94a3b8", cursor: "grab" }}
                  />
                </TableCell>
                {columns.map((col) => (
                  <TableCell key={col}>
                    <TextField
                      size="small"
                      fullWidth
                      value={String(row[col] ?? "")}
                      onChange={(e) =>
                        updateCell(rowIndex, col, e.target.value)
                      }
                      variant="standard"
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <IconButton size="small" onClick={() => removeRow(rowIndex)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={addRow}
        sx={{ mt: 1 }}
      >
        Добавить строку
      </Button>
    </Box>
  );
}
