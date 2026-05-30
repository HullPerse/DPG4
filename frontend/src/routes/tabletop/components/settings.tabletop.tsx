import CellApi from "@/api/cell.api";
import { SmallLoader } from "@/components/shared/loader.component";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.component";
import { cellsConfig } from "@/config/cells.config";

import { Cell } from "@/types/cell";
import { useState } from "react";

const cellApi = new CellApi();

export default function Settings({
  cell,
  setOpen,
}: {
  cell: Cell;
  setOpen: (value: boolean) => void;
}) {
  const [title, setTitle] = useState(cell.title);
  const [conditions, setConditions] = useState(cell.conditions || {});
  const [cellType, setCellType] = useState(cell.cellType);
  const [difficulty, setDifficulty] = useState(cell.difficulty);
  const [ladderTo, setLadderTo] = useState(cell.ladderTo);
  const [snakeTo, setSnakeTo] = useState(cell.snakeTo);

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);

    const data = {
      id: cell.id,
      type: cell.type,
      number: cell.number,
      title,
      conditions,
      cellType,
      difficulty,
      ladderTo,
      snakeTo,
    };

    try {
      await cellApi.editCell(cell.id, data as Cell);
    } catch (error) {
      console.log(error);
      setLoading(false);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <main className="flex h-full w-full flex-col gap-2 text-text">
      <div className="flex flex-col">
        <span>Название</span>
        <Input
          placeholder="Имя клетки"
          className="w-full"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col">
        <span>Время прохождения</span>
        <Input
          placeholder="Время прохождения"
          className="w-full"
          type="text"
          value={conditions["Время прохождения"]}
          onChange={(e) =>
            setConditions({
              ...conditions,
              "Время прохождения": e.target.value,
            })
          }
        />
      </div>
      <div className="flex flex-col">
        <span>Цена</span>
        <Input
          placeholder="Цена"
          className="w-full"
          type="text"
          value={conditions["Цена"]}
          onChange={(e) =>
            setConditions({
              ...conditions,
              Цена: e.target.value,
            })
          }
        />
      </div>
      <div className="flex flex-col">
        <span>Оценка</span>
        <Input
          placeholder="Оценка"
          className="w-full"
          type="text"
          value={conditions["Оценка"]}
          onChange={(e) =>
            setConditions({
              ...conditions,
              Оценка: e.target.value,
            })
          }
        />
      </div>
      <div className="flex flex-col">
        <span>Дата выхода</span>
        <Input
          placeholder="Дата выхода"
          className="w-full"
          type="text"
          value={conditions["Дата выхода"]}
          onChange={(e) =>
            setConditions({
              ...conditions,
              "Дата выхода": e.target.value,
            })
          }
        />
      </div>
      <div className="flex flex-col">
        <span>Пресет</span>
        <Input
          placeholder="Пресет"
          className="w-full"
          type="text"
          value={conditions["Пресет"]}
          onChange={(e) =>
            setConditions({
              ...conditions,
              Пресет: e.target.value,
            })
          }
        />
      </div>
      <div className="flex flex-col">
        <span>Количество игр</span>
        <Input
          placeholder="Количество игр"
          className="w-full"
          type="text"
          value={conditions["Количество игр"]}
          onChange={(e) =>
            setConditions({
              ...conditions,
              "Количество игр": e.target.value,
            })
          }
        />
      </div>
      <div className="flex flex-col">
        <span>Дополнительно</span>
        <Input
          placeholder="Дополнительно"
          className="w-full"
          type="text"
          value={conditions["Дополнительно"]}
          onChange={(e) =>
            setConditions({
              ...conditions,
              Дополнительно: e.target.value,
            })
          }
        />
      </div>
      <div className="flex flex-col">
        <span>Тип</span>
        <Select
          value={cellType}
          onValueChange={(e) => setCellType(e as string)}
        >
          <SelectTrigger className="w-full py-5">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {cellsConfig.type.map((item) => (
                <SelectItem key={item.name} value={item.label}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col">
        <span>Сложность</span>
        <Select
          value={difficulty}
          onValueChange={(e) => setDifficulty(e as string)}
        >
          <SelectTrigger className="w-full py-5">
            <SelectValue placeholder="Сложность" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {cellsConfig.difficulty.map((item) => (
                <SelectItem
                  key={item.name}
                  value={item.label}
                  style={{ color: item.color }}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col">
        <span>Лестница к какой клетке</span>
        <Input
          placeholder="Лестница к какой клетке"
          className="w-full"
          type="number"
          min="1"
          max="100"
          value={ladderTo}
          onChange={(e) => setLadderTo(Number(e.target.value))}
        />
      </div>
      <div className="flex flex-col">
        <span>Змея к какой клетке</span>
        <Input
          placeholder="Змея к какой клетке"
          className="w-full"
          type="number"
          min="1"
          max="100"
          value={snakeTo}
          onChange={(e) => setSnakeTo(Number(e.target.value))}
        />
      </div>

      <Button
        variant="success"
        className="w-full"
        disabled={loading}
        onClick={handleSave}
      >
        {loading ? <SmallLoader /> : "Сохранить"}
      </Button>
    </main>
  );
}
