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
    <main className="flex flex-col gap-2 absolute bottom-2 left-2 z-100 items-center justify-center bg-card p-2 rounded border-2 border-highlight-high w-2xl">
      <div className="flex flex-row gap-2 w-full items-center justify-between">
        <span className="font-bold">Инструменты</span>
        <X
          className="place-self-end size-5 text-muted hover:text-text cursor-pointer mb-2"
          onClick={() => setShowTools(false)}
        />
      </div>

      {/* admin tools */}
      {isAdmin && (
        <section className="flex flex-col w-full h-full gap-2 border-b-2 border-highlight-high pb-2">
          <div className="flex flex-row items-center gap-2 justify-between">
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
      <section className="flex flex-col w-full h-full gap-2 border-highlight-high pb-2">
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
