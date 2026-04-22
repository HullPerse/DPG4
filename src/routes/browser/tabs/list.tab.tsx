import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, startTransition, useCallback, useState } from "react";
import { useSubscription } from "@/hooks/subscription.hook";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon, Plus } from "lucide-react";
import ItemsApi from "@/api/items.api";
import { Item } from "@/types/items";
import { Button } from "@/components/ui/button.component";
import { useUserStore } from "@/store/user.store";
import { Input } from "@/components/ui/input.component";
import { X } from "lucide-react";
import Image from "@/components/shared/image.component";
import { image as clientImage } from "@/api/client.api";
import { highlightText } from "@/lib/utils";
import type { SortMethod, SortDirection } from "../browser.root";

const itemsApi = new ItemsApi();

interface ListBrowserProps {
  searchTerms: string;
  sortMethod: SortMethod;
  sortDirection: SortDirection;
  setSortMethod: (method: SortMethod) => void;
  setSortDirection: (direction: SortDirection) => void;
}

function ListBrowser({
  searchTerms,
  sortMethod,
  sortDirection,
}: ListBrowserProps) {
  const queryClient = useQueryClient();
  const isAdmin = useUserStore((state) => state.isAdmin);
  const user = useUserStore((state) => state.user);

  const [addItem, setAddItem] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [label, setLabel] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [charge, setCharge] = useState<string>("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["listTab"],
    queryFn: async (): Promise<Item[]> => itemsApi.getAllItems(),
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["listTab"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("items", "*", invalidateQuery);

  const handleCreateItem = useCallback(async () => {
    if (!label.trim() || !description.trim()) return;

    return await itemsApi
      .addItem({
        label: label.trim(),
        description: description.trim(),
        charge: Number(charge ?? 1),
        image: image ?? null,
      })
      .finally(() => {
        setLabel("");
        setDescription("");
        setCharge("");
        setImage(null);
        setImagePreview(null);
        setAddItem(false);
      });
  }, [label, description, charge, image]);

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка")}
        icon={<NetworkIcon />}
        refresh={refetch}
        button
      />
    );

  if (addItem) {
    return (
      <main className="flex flex-col w-full h-full gap-2 p-2">
        <section className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="font-bold">Название</span>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Введите название предмета"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold">Описание</span>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание предмета"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold">Заряд</span>
            <Input
              type="number"
              value={charge}
              onChange={(e) => setCharge(e.target.value)}
              placeholder="Введите заряд предмета"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-bold">Изображение</span>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setImage(file);
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setImagePreview(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                } else {
                  setImagePreview(null);
                }
              }}
            />
            {imagePreview && (
              <div className="relative mt-2 w-30 max-w-50 h-50 min-h-30">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-0 right-0 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </label>
        </section>
        <section className="flex flex-row w-full mt-auto items-center justify-around">
          <Button
            variant="error"
            onClick={() => {
              setLabel("");
              setDescription("");
              setCharge("");
              setImage(null);
              setImagePreview(null);
              setAddItem(false);
              setAddItem(false);
            }}
            className="w-[calc(50%-0.5rem)]"
          >
            Отменить
          </Button>
          <Button onClick={handleCreateItem} className="w-[calc(50%-0.5rem)]">
            Добавить
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex h-full w-full flex-col gap-2 overflow-y-auto p-2 items-center">
      {isAdmin && (
        <Button
          variant="success"
          className="w-full"
          onClick={() => {
            if (!isAdmin) return;

            setAddItem(true);
          }}
        >
          <Plus />
        </Button>
      )}

      {data
        ?.filter(
          (item) =>
            item.label.toUpperCase().includes(searchTerms.toUpperCase()) ||
            item.description.toUpperCase().includes(searchTerms.toUpperCase()),
        )
        .sort((a, b) => {
          let comparison = 0;
          switch (sortMethod) {
            case "name":
              comparison = a.label.localeCompare(b.label);
              break;
            case "date":
              comparison = String(a.created || "").localeCompare(
                String(b.created || ""),
              );
              break;
            case "charges":
              comparison = (a.charge || 0) - (b.charge || 0);
              break;
          }
          return sortDirection === "asc" ? comparison : -comparison;
        })
        .map((item) => (
          <section
            key={item.id}
            className="relative p-2 flex flex-row w-full min-h-fit h-22 border-2 border-highlight-high items-center"
          >
            <div className="flex flex-col gap-1">
              <Image
                src={`${clientImage?.items}${item.id}/${item.image}`}
                alt={item.label}
                className="min-w-20 min-h-20 w-20 h-20 flex items-center justify-center border-2 border-highlight-high bg-background "
              />
              <span className="w-20 h-6 bg-card text-primary font-bold border border-highlight-high text-center">
                {item.charge}
              </span>
            </div>
            <div className="flex flex-col ml-2">
              <span className="font-bold text-xl">
                {highlightText(item.label, searchTerms)}
              </span>
              <span className="text-text/80">
                {highlightText(item.description, searchTerms)}
              </span>
            </div>
            <div className="ml-auto mb-auto flex flex-row gap-1">
              <Button
                variant="success"
                size="icon"
                title="Добавить предмет в инвентарь"
                onClick={async () => {
                  if (!user) return;
                  setLoading(true);

                  await itemsApi.addInventory(
                    String(user?.id),
                    String(item.id),
                    `${clientImage?.items}${item.id}/${item.image}`,
                  );

                  queryClient.invalidateQueries({
                    queryKey: ["inventoryTab", user.id],
                    refetchType: "all",
                  });

                  setLoading(false);
                }}
              >
                {loading ? <SmallLoader /> : <Plus />}
              </Button>
            </div>
          </section>
        ))}
    </main>
  );
}

export default memo(ListBrowser);
