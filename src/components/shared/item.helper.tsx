import { translateItemType } from "@/lib/utils";
import { Inventory, Item } from "@/types/items";
import ImageComponent from "./image.component";
import { image } from "@/api/client.api";

function ItemHelper({ item, type }: { item: Inventory | Item | null; type: "inventory" | "item" }) {
  if (!item) return <main>Выберите предмет</main>;

  const imageCollection = type === "item" ? image.items : image.inventory;

  return (
    <main className="flex flex-row">
      <section className="flex flex-col gap-1">
        <span className="w-20 h-6 bg-card text-primary font-bold border border-highlight-high text-center text-[14px]">
          {translateItemType(item.type)}
        </span>
        <ImageComponent
          src={`${imageCollection}${item.id}/${item.image}`}
          alt={item.label}
          className="min-w-20 min-h-20 w-20 h-20 flex items-center justify-center border-2 border-highlight-high bg-background "
        />
        <span className="w-20 h-6 bg-card text-primary font-bold border border-highlight-high text-center">
          {item.charge}
        </span>
      </section>
      <span className="flex overflow-y-auto text-xs leading-tight h-38 max-h-38 p-1">
        {item.description}
      </span>
    </main>
  );
}

export default ItemHelper;
