import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.component";
import { Switch } from "@/components/ui/switch.component";
import { cellsConfig } from "@/config/cells.config";
import { useDataStore } from "@/store/data.store";
import { useUserStore } from "@/store/user.store";
import { X } from "lucide-react";

export default function ToolsTaletop({
  setShowTools,
  isEditing,
  setEditing,
}: {
  setShowTools: (value: boolean) => void;
  isEditing: boolean;
  setEditing: (value: boolean) => void;
}) {
  const isAdmin = useUserStore((state) => state.isAdmin);
  const dataStore = useDataStore((state) => state);

  return (
    <main className="absolute bottom-2 left-2 z-100 flex w-2xl flex-col items-center justify-center gap-2 rounded border-2 border-highlight-high bg-card p-2">
      <div className="flex w-full flex-row items-center justify-between gap-2">
        <span className="font-bold">Инструменты</span>
        <X
          className="mb-2 size-5 cursor-pointer place-self-end text-muted hover:text-text"
          onClick={() => setShowTools(false)}
        />
      </div>

      {/* admin tools */}
      {isAdmin && (
        <section className="flex h-full w-full flex-col gap-2 border-b-2 border-highlight-high pb-2">
          <div className="flex flex-row items-center justify-between gap-2">
            Режим редактирования:
            <Switch
              className="cursor-pointer"
              checked={isEditing}
              onCheckedChange={setEditing}
            />
          </div>
        </section>
      )}

      {/* user tools */}
      <section className="flex h-full w-full flex-col gap-2 border-highlight-high pb-2">
        <div className="flex flex-col">
          <span>Стрелки:</span>
          <Select
            value={
              cellsConfig.arrowType.find(
                (item) => item.name === dataStore.arrowType,
              )?.label
            }
            onValueChange={(e) =>
              dataStore.setArrowType(
                e as "all" | "none" | "arrows" | "icons" | "ladders" | "snakes",
              )
            }
          >
            <SelectTrigger className="w-full py-5">
              <SelectValue placeholder="Стрелки" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {cellsConfig.arrowType.map((item) => (
                  <SelectItem key={item.name} value={item.name}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </section>
    </main>
  );
}
