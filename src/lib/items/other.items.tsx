import { Button } from "@/components/ui/button.component";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.component";
import { useQuery } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import ItemsApi from "@/api/items.api";
import { useUserStore } from "@/store/user.store";
const itemsApi = new ItemsApi();

export interface otherInterface {
  label: string;
  body: () => ReactNode;
  effect: () => void;
  type: "modal" | "effect";
}

export const otherEffect: otherInterface[] = [
  {
    label: "Дырявый сапог",
    type: "modal",
    body: () => {
      const user = useUserStore((state) => state.user);

      const { data, isLoading, isError } = useQuery({
        queryKey: ["modalData"],
        queryFn: async () => {
          const allItems = await itemsApi.getInventory(String(user?.id));
          return allItems.filter((item) => item.label === "Дырявый сапог");
        },
        enabled: !!user,
      });

      const [item, setItem] = useState<string>("");

      return (
        <main className="flex flex-col gap-2">
          {/* Input */}
          <label className="flex flex-col gap-1">
            <span className="font-bold">Предмет</span>
            <Select
              value={item}
              onValueChange={(e) => {
                if (!e) return;

                setItem(e);
              }}>
              <SelectTrigger className="w-full py-5">
                <SelectValue placeholder="Предмет" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {data?.map((item) => (
                    <SelectItem key={item.id} value={item.label}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          {/* Buttons */}
          <section className="flex flex-row items-center justify-between gap-2 p-1">
            <Button className="flex flex-1" variant="success" disabled>
              Объединить
            </Button>
          </section>
        </main>
      );
    },
    effect: async () => {},
  },
  {
    label: "Пустой пакет",
    type: "modal",
    body: () => {
      const idea = 123;

      return <main>{idea}</main>;
    },
    effect: async () => {},
  },
  {
    label: "Таинственный предмет",
    type: "effect",
    body: () => {
      return <main>Hello World!</main>;
    },
    effect: async () => {},
  },
  {
    label: "Светлое нефильтрованное",
    type: "modal",
    body: () => {
      return <main>Hello World!</main>;
    },
    effect: async () => {},
  },
];
