import { Loader2, Search as SearchIcon, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { adminFetch } from "@/adminApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSchema } from "@/context/SchemaContext";
import { renderListCell } from "@/components/fieldRenderer";

export function SearchPage() {
  const { schema } = useSchema();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Record<string, Record<string, unknown>[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    const q = query.trim();
    if (!q || q.length < 2) return;
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch<{ results: Record<string, Record<string, unknown>[]> }>(
        `/api/admin/search?q=${encodeURIComponent(q)}`,
      );
      setResults(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-6">
      <h1 className="mb-4 text-2xl font-bold shrink-0">Глобальный поиск</h1>

      <div className="mb-4 flex shrink-0 gap-2">
        <Input
          placeholder="Поиск по всем таблицам (мин. 2 символа)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-md"
        />
        <Button type="button" variant="outline" onClick={handleSearch} disabled={loading || query.trim().length < 2}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
          Найти
        </Button>
      </div>

      {error && <p className="text-love mb-2 shrink-0 text-sm">{error}</p>}

      {Object.keys(results).length === 0 && !loading && !error && (
        <p className="text-muted mt-8 text-center text-sm">
          Введите запрос для поиска по всем таблицам
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {Object.entries(results).map(([tableName, rows]) => {
          const meta = schema.tables[tableName];
          const listFields = meta?.fields.filter(
            (f) => f.type !== "hidden" && f.type !== "password" && !f.hideInList,
          ) ?? [];
          return (
            <div key={tableName} className="mb-6">
              <Link
                to={`/${tableName}`}
                className="text-primary hover:text-iris mb-2 inline-flex items-center gap-1 text-lg font-bold"
              >
                {meta?.label ?? tableName}
                <ExternalLink className="size-3.5" />
              </Link>
              <div className="border-highlight-high overflow-x-auto border">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-highlight-high border-b">
                      {listFields.map((f) => (
                        <th key={f.source} className="text-muted px-2 py-1.5 font-bold uppercase">
                          {f.source}
                        </th>
                      ))}
                      <th className="text-muted px-2 py-1.5 font-bold uppercase"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row) => (
                      <tr key={String(row.id)} className="hover:bg-highlight-low/50 border-highlight-high border-b">
                        {listFields.map((f) => (
                          <td key={f.source} className="max-w-[200px] truncate px-2 py-1">
                            {renderListCell(f, row, tableName)}
                          </td>
                        ))}
                        <td className="px-2 py-1">
                          <Link
                            to={`/${tableName}/${row.id}`}
                            className="text-muted hover:text-primary text-xs"
                          >
                            Открыть
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
