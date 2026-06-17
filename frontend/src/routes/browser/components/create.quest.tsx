import QuestsApi from "@/api/quests.api";
import { Button } from "@/components/ui/button.component";
import { Combobox } from "@/components/ui/combobox.component";
import { Input } from "@/components/ui/input.component";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.component";
import { Item } from "@/types/items";
import { Quest, QuestReward } from "@/types/quests";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const questsApi = new QuestsApi();

function CreateQuest({
  items,
  onClose,
}: {
  items: Item[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [label, setLabel] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [rewards, setRewards] = useState<QuestReward[]>([
    { type: "money", value: 0 },
  ]);

  const addReward = () => setRewards([...rewards, { type: "money", value: 0 }]);
  const removeReward = (index: number) =>
    setRewards(rewards.filter((_, i) => i !== index));
  const updateReward = (
    index: number,
    field: keyof QuestReward,
    val: string | number,
  ) =>
    setRewards(
      rewards.map((r, i) => (i === index ? { ...r, [field]: val } : r)),
    );

  const createMutation = useMutation({
    mutationFn: async () => {
      const questData = {
        label: label,
        description: description,
        reward: rewards.map((r) => ({
          ...r,
          value: r.type === "money" ? Number(r.value) || 0 : r.value,
        })),
      } as Quest;

      await questsApi.create(questData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      setLabel("");
      setDescription("");
      setRewards([{ type: "money", value: 0 }]);
      onClose();
    },
  });

  return (
    <main className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <span className="font-bold">Название</span>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Название"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-bold">Описание</span>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Описание"
        />
      </div>
      {rewards.map((reward, i) => (
        <div
          key={i}
          className="flex gap-2 items-end border border-highlight-low p-2"
        >
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-xs text-muted">Тип</span>
            <Select
              value={reward.type}
              onValueChange={(val) =>
                updateReward(i, "type", val as "item" | "money")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="money">Чубрики</SelectItem>
                  <SelectItem value="item">Предмет</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 flex-1">
            <span className="text-xs text-muted">
              {reward.type === "money" ? "Количество" : "Предмет"}
            </span>
            {reward.type === "money" ? (
              <Input
                type="number"
                className="h-9"
                min={0}
                value={String(reward.value)}
                onChange={(e) =>
                  updateReward(i, "value", Number(e.target.value))
                }
              />
            ) : (
              <Combobox
                options={items.map((i) => {
                  return {
                    label: i.label,
                    value: String(i.id),
                  };
                })}
                value={String(reward.value)}
                onChange={(val) => val && updateReward(i, "value", val)}
                placeholder="Выберите предмет"
                className="w-64"
              />
            )}
          </div>

          <Button variant="error" size="icon" onClick={() => removeReward(i)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}

      <section className="flex flex-row gap-2">
        <Button
          variant="info"
          size="icon"
          disabled={rewards.length >= 5}
          onClick={addReward}
        >
          <Plus />
        </Button>
        <Button
          variant="success"
          className="mt-auto flex-1"
          onClick={() => createMutation.mutate()}
          loading={createMutation.isPending}
          disabled={!label || !description || !rewards}
        >
          СОЗДАТЬ
        </Button>
      </section>
    </main>
  );
}

export default CreateQuest;
