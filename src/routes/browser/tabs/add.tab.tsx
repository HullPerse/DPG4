import ItemsApi from "@/api/items.api";
import ImageComponent from "@/components/shared/image.component";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { Switch } from "@/components/ui/switch.component";
import { Item } from "@/types/items";
import { X } from "lucide-react";
import { useCallback, useState } from "react";

const itemsApi = new ItemsApi();

function AddItem({ setAddItem }: { setAddItem: (value: boolean) => void }) {
  const [label, setLabel] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [charge, setCharge] = useState<string>("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rollable, setRollable] = useState<boolean>(true);

  const handleCreateItem = useCallback(async () => {
    if (!label.trim() || !description.trim()) return;

    const data = {
      label: label.trim(),
      description: description.trim(),
      charge: Number(charge ?? 1),
      image: image ?? null,
      rollable: rollable,
    } as Item;

    return await itemsApi.addItem(data).finally(() => {
      setLabel("");
      setDescription("");
      setCharge("");
      setImage(null);
      setImagePreview(null);
      setAddItem(false);
    });
  }, [label, description, charge, image]);

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
          <span className="font-bold">Выпадение с колеса</span>
          <Switch checked={rollable} onCheckedChange={setRollable} />
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
            <div className="relative mt-2 w-fit h-fit">
              <ImageComponent
                src={imagePreview}
                alt="Preview"
                className="min-w-46 w-46 min-h-46 h-46 border border-highlight-high"
              />
              <Button
                variant="error"
                size="icon"
                onClick={() => {
                  setImage(null);
                  setImagePreview(null);
                }}
                className="absolute top-0 right-0 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <X size={12} />
              </Button>
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

export default AddItem;
