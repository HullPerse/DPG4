import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminFetch } from "@/adminApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const ok = status && !status.toLowerCase().includes("ошиб");

  return (
    <div className="p-6 md:p-8">
      <Link
        to="/"
        className="text-muted hover:text-text mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        На главную
      </Link>
      <h1 className="text-2xl font-bold">Выдать предмет</h1>
      <p className="text-muted mt-1 text-sm">
        Добавляет запись в инвентарь выбранного игрока.
      </p>
      <Card className="mt-6 max-w-md space-y-4">
        <div>
          <Label htmlFor="user">Игрок</Label>
          <Input
            id="user"
            list="users-list"
            placeholder="username или id"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <datalist id="users-list">
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username ?? u.id}
              </option>
            ))}
          </datalist>
        </div>
        <div>
          <Label htmlFor="item">Предмет</Label>
          <Input
            id="item"
            list="items-list"
            placeholder="label или id"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
          />
          <datalist id="items-list">
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label ?? i.id}
              </option>
            ))}
          </datalist>
        </div>
        <Button
          type="button"
          variant="primary"
          disabled={!userId || !itemId}
          onClick={() => void submit()}
        >
          Выдать в инвентарь
        </Button>
        {status && (
          <p className={`text-sm ${ok ? "text-green-400" : "text-love"}`}>{status}</p>
        )}
      </Card>
    </div>
  );
}
