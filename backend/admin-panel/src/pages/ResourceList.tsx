import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableElement,
  DataTableHead,
} from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { renderListCell } from "@/components/fieldRenderer";
import { deleteRecord, listRecords } from "@/lib/data";
import { useSchema } from "@/context/SchemaContext";
import type { AdminFieldMeta } from "@/types";

export function ResourceListPage() {
  const { resource = "" } = useParams<{ resource: string }>();
  const { schema } = useSchema();
  const meta = schema.tables[resource];
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") ?? "1");
  const q = searchParams.get("q") ?? "";
  const sortField = searchParams.get("sort") ?? "created";
  const sortOrder = (
    searchParams.get("order") ?? "ASC"
  ).toUpperCase() as "ASC" | "DESC";

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(q);

  const listFields = meta?.fields.filter(
    (f) => f.type !== "hidden" && f.type !== "password" && !f.hideInList,
  ) ?? [];

  const load = useCallback(async () => {
    if (!meta) return;
    setLoading(true);
    setError("");
    try {
      const filter: Record<string, unknown> = {};
      if (q) filter.q = q;
      const res = await listRecords(resource, {
        page,
        perPage: 25,
        sortField,
        sortOrder,
        filter,
      });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [resource, page, q, sortField, sortOrder, meta]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!meta) {
    return <p className="text-love p-6">Неизвестная таблица: {resource}</p>;
  }

  const totalPages = Math.max(1, Math.ceil(total / 25));

  const applySearch = () => {
    const next = new URLSearchParams(searchParams);
    if (search) next.set("q", search);
    else next.delete("q");
    next.set("page", "1");
    setSearchParams(next);
  };

  const toggleSort = (field: string) => {
    const next = new URLSearchParams(searchParams);
    if (sortField === field) {
      next.set("order", sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      next.set("sort", field);
      next.set("order", "ASC");
    }
    next.set("page", "1");
    setSearchParams(next);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Удалить запись ${id}?`)) return;
    try {
      await deleteRecord(resource, id);
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка удаления");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-6">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{meta.label}</h1>
        <Link
          to={`/${resource}/create`}
          className="bg-primary/20 border-primary text-text inline-flex h-9 shrink-0 items-center gap-2 border-2 px-4 text-sm font-bold"
        >
          <Plus className="size-4" />
          Создать
        </Link>
      </div>

      <div className="mb-4 flex shrink-0 gap-2">
        <Input
          placeholder="Поиск"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applySearch()}
          className="max-w-xs"
        />
        <Button type="button" variant="outline" onClick={applySearch}>
          Найти
        </Button>
      </div>

      {error && <p className="text-love mb-2 shrink-0 text-sm">{error}</p>}

      {loading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Loader2 className="text-primary size-8 animate-spin" />
        </div>
      ) : (
        <DataTable className="min-h-0 flex-1">
          <DataTableElement>
            <DataTableHead>
              <tr>
                {listFields.map((f: AdminFieldMeta) => {
                  const active = sortField === f.source;
                  const SortIcon = active
                    ? sortOrder === "ASC"
                      ? ArrowUp
                      : ArrowDown
                    : ArrowUpDown;
                  return (
                    <th
                      key={f.source}
                      className="border-highlight-high border px-0 py-0 font-bold"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(f.source)}
                        className={`hover:bg-highlight-med flex w-full items-center gap-1 px-2 py-2 text-left uppercase ${
                          active ? "text-text" : "text-muted hover:text-text"
                        }`}
                        title={
                          active
                            ? sortOrder === "ASC"
                              ? "По возрастанию — нажмите для убывания"
                              : "По убыванию — нажмите для возрастания"
                            : "Сортировать"
                        }
                      >
                        <span className="truncate">{f.source}</span>
                        <SortIcon
                          className={`size-3.5 shrink-0 ${active ? "text-primary" : "opacity-40"}`}
                        />
                      </button>
                    </th>
                  );
                })}
                <th className="border-highlight-high w-28 border px-2 py-2" />
              </tr>
            </DataTableHead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)} className="hover:bg-highlight-low/50">
                  {listFields.map((f) => (
                    <td
                      key={f.source}
                      className="border-highlight-high max-w-[240px] border px-2 py-1.5 align-top"
                    >
                      <div className="max-h-24 overflow-hidden">
                        {renderListCell(f, row, resource)}
                      </div>
                    </td>
                  ))}
                  <td className="border-highlight-high border px-2 py-1 align-top">
                    <div className="flex gap-1">
                      <Link
                        to={`/${resource}/${row.id}`}
                        className="text-muted hover:text-primary p-1"
                        title="Просмотр"
                      >
                        <Eye className="size-4" />
                      </Link>
                      <Link
                        to={`/${resource}/${row.id}/edit`}
                        className="text-muted hover:text-iris p-1"
                        title="Изменить"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <button
                        type="button"
                        className="text-muted hover:text-love p-1"
                        title="Удалить"
                        onClick={() => void handleDelete(String(row.id))}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTableElement>
        </DataTable>
      )}

      <div className="text-muted mt-4 flex shrink-0 items-center gap-2 text-sm">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.set("page", String(page - 1));
            setSearchParams(next);
          }}
        >
          Назад
        </Button>
        <span>
          {page} / {totalPages} · всего {total}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.set("page", String(page + 1));
            setSearchParams(next);
          }}
        >
          Вперёд
        </Button>
      </div>
    </div>
  );
}
