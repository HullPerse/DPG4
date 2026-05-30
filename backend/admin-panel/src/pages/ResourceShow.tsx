import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { renderShowField } from "@/components/fieldRenderer";
import { deleteRecord, getRecord } from "@/lib/data";
import { useSchema } from "@/context/SchemaContext";

export function ResourceShowPage() {
  const { resource = "", id = "" } = useParams<{ resource: string; id: string }>();
  const { schema } = useSchema();
  const meta = schema.tables[resource];
  const navigate = useNavigate();
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!meta) return;
    setLoading(true);
    getRecord(resource, id)
      .then(setRecord)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [resource, id, meta]);

  if (!meta) {
    return <p className="text-love p-6">Неизвестная таблица</p>;
  }

  const showFields = meta.fields.filter(
    (f) => f.type !== "hidden" && f.type !== "password",
  );

  const handleDelete = async () => {
    if (!confirm(`Удалить запись ${id}?`)) return;
    try {
      await deleteRecord(resource, id);
      navigate(`/${resource}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  return (
    <div className="w-full min-w-0 p-6">
      <Link
        to={`/${resource}`}
        className="text-muted hover:text-text mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        К списку
      </Link>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">
          {meta.label} #{id}
        </h1>
        <div className="flex gap-2">
          <Link
            to={`/${resource}/${id}/edit`}
            className="border-iris inline-flex h-9 items-center gap-2 border-2 px-3 text-sm font-bold"
          >
            <Pencil className="size-4" />
            Изменить
          </Link>
          <Button type="button" variant="danger" onClick={() => void handleDelete()}>
            <Trash2 className="size-4" />
            Удалить
          </Button>
        </div>
      </div>

      {loading ? (
        <Loader2 className="text-primary size-8 animate-spin" />
      ) : error ? (
        <p className="text-love">{error}</p>
      ) : record ? (
        <Card className="w-full">
          {showFields.map((f) => renderShowField(f, record, resource))}
        </Card>
      ) : null}
    </div>
  );
}
