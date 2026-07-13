import { BookOpen, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { adminFetch } from "@/adminApi";

interface OpenApiSpec {
  paths: Record<string, Record<string, { summary?: string; tags?: string[] }>>;
}

export function ApiDocsPage() {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch<OpenApiSpec>("/api/docs/json")
      .then(setSpec)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load API docs"));
  }, []);

  if (error) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-love">{error}</p>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    );
  }

  const entries = Object.entries(spec.paths).sort(([a], [b]) => a.localeCompare(b));

  const methodColors: Record<string, string> = {
    get: "text-emerald-400",
    post: "text-sky-400",
    put: "text-amber-400",
    patch: "text-amber-400",
    delete: "text-red-400",
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-center gap-2">
        <BookOpen className="text-primary size-5" />
        <h1 className="text-2xl font-bold">API Docs</h1>
      </div>
      <div className="border-highlight-high bg-card overflow-x-auto border-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-highlight-high border-b-2 text-left">
              <th className="text-muted px-4 py-3 font-bold text-[10px] uppercase tracking-wider">
                Method
              </th>
              <th className="text-muted px-4 py-3 font-bold text-[10px] uppercase tracking-wider">
                Path
              </th>
              <th className="text-muted px-4 py-3 font-bold text-[10px] uppercase tracking-wider">
                Summary
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([path, methods]) =>
              Object.entries(methods).map(([method, meta]) => (
                <tr
                  key={`${method}-${path}`}
                  className="border-highlight-medium border-b hover:bg-highlight-low"
                >
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs font-bold uppercase ${methodColors[method] ?? "text-text"}`}>
                      {method}
                    </span>
                  </td>
                  <td className="text-text px-4 py-3 font-mono text-xs">{path}</td>
                  <td className="text-muted px-4 py-3 text-xs">{meta.summary ?? ""}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
