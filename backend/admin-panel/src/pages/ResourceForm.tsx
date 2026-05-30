import { ArrowLeft, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SmartInput } from "@/components/fieldRenderer";
import { createRecord, getRecord, updateRecord } from "@/lib/data";
import { useSchema } from "@/context/SchemaContext";

export function ResourceFormPage({ mode }: { mode: "create" | "edit" }) {
  const { resource = "", id = "" } = useParams<{ resource: string; id: string }>();
  const { schema } = useSchema();
  const meta = schema.tables[resource];
  const navigate = useNavigate();
  const isCreate = mode === "create";

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [record, setRecord] = useState<Record<string, unknown> | undefined>();
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!meta || isCreate) return;
    setLoading(true);
    getRecord(resource, id)
      .then((data) => {
        setRecord(data);
        setValues({ ...data });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [resource, id, meta, isCreate]);

  if (!meta) {
    return <p className="text-love p-6">Неизвестная таблица</p>;
  }

  const formFields = meta.fields.filter((f) => f.type !== "hidden");

  const onChange = (source: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [source]: value }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...values };
      if (isCreate) {
        const created = await createRecord(resource, payload);
        navigate(`/${resource}/${created.id}`);
      } else {
        await updateRecord(resource, id, payload);
        navigate(`/${resource}/${id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-w-0 p-6">
      <Link
        to={isCreate ? `/${resource}` : `/${resource}/${id}`}
        className="text-muted hover:text-text mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Назад
      </Link>
      <h1 className="mb-4 text-2xl font-bold">
        {isCreate ? `Создать: ${meta.label}` : `Изменить: ${meta.label} #${id}`}
      </h1>

      {loading ? (
        <Loader2 className="text-primary size-8 animate-spin" />
      ) : (
        <Card className="w-full">
          <form onSubmit={(e) => void onSubmit(e)}>
            {formFields.map((f) => (
              <SmartInput
                key={f.source}
                field={f}
                record={record}
                resource={resource}
                values={values}
                onChange={onChange}
                isCreate={isCreate}
              />
            ))}
            {error && <p className="text-love mb-3 text-sm">{error}</p>}
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              Сохранить
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
