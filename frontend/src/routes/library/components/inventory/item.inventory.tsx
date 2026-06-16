import { getFileUrl } from "@/api/client.api";
import ImageComponent from "@/components/shared/image.component";
import { SmallLoader } from "@/components/shared/loader.component";
import { Button } from "@/components/ui/button.component";
import { highlightText, translateItemType } from "@/lib/utils";
import { useUserStore } from "@/store/user.store";
import { Inventory } from "@/types/items";
import { UseMutationResult } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { ItemLoadingType } from "../../tabs/inventory.tab";

function ItemInventory({
  item,
  searchTerms,
  itemMutation,
  itemLoading,
  currentId,
  index,
  setPrice,
  setActive,
}: {
  item: Inventory;
  searchTerms: string;
  itemMutation: UseMutationResult<
    | {
        ok: true;
        mode: "done";
      }
    | {
        ok: true;
        mode: "modal";
        label: string;
      }
    | {
        ok: false;
        error: string;
      }
    | undefined,
    Error,
    {
      type: ItemLoadingType | "charge";
      itemId: string;
      userId?: string;
      owner?: string;
      price?: number;
      oldCharge?: number;
      newCharge?: number;
    },
    unknown
  >;
  itemLoading: (
    itemId: string,
    type?: ItemLoadingType | "charge" | undefined,
  ) => boolean;
  currentId: string;
  index: number;
  setPrice: (value: string) => void;
  setActive: (value: number | null) => void;
}) {
  const user = useUserStore((state) => state.user);

  return (
    <main
      role="button"
      tabIndex={0}
      className="relative flex flex-col min-w-64 min-h-64 w-64 h-64 overflow-hidden border-2 border-highlight-high shadow-sharp-sm bg-background hover:opacity-100 opacity-75 hover:cursor-pointer items-center p-2"
      onClick={() => {
        if (itemMutation.isPending) return;
        setPrice("");
        setActive(index);
      }}
    >
      {itemLoading(String(item.id)) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
          <SmallLoader size={28} />
        </div>
      )}
      <span className="font-bold text-md line-clamp-1 w-full text-center wrap-break-word">
        {highlightText(item.label, searchTerms)}
      </span>

      <div className="flex flex-col items-center justify-center">
        <span className="w-full h-6 items-center justify-center my-1 bg-card text-primary font-bold border border-highlight-high text-center text-[14px]">
          {translateItemType(item.type)}
        </span>
        <ImageComponent
          src={`${getFileUrl(item)}`}
          alt={item.label}
          className="min-w-24 w-24 min-h-24 h-24 border border-highlight-high"
          type="cover"
        />

        <div className="flex flex-row gap-0.5 w-full h-6 items-center justify-center my-1">
          <Button
            variant="error"
            size="icon"
            rendered={currentId === user?.id}
            className="w-6 h-6"
            onClick={(e) => {
              e.stopPropagation();

              itemMutation.mutate({
                type: "charge",
                itemId: String(item.id),
                oldCharge: item.charge,
                newCharge: -1,
              });
            }}
          >
            <Minus />
          </Button>
          <span className="w-24 h-6 bg-card text-primary font-bold border border-highlight-high text-center">
            {item.charge}
          </span>
          <Button
            rendered={currentId === user?.id}
            variant="success"
            size="icon"
            className="w-6 h-6"
            onClick={(e) => {
              e.stopPropagation();

              itemMutation.mutate({
                type: "charge",
                itemId: String(item.id),
                oldCharge: item.charge,
                newCharge: 1,
              });
            }}
          >
            <Plus />
          </Button>
        </div>
      </div>

      <span className="line-clamp-3 hover:line-clamp-none hover:overflow-y-auto text-xs leading-tight h-16 max-h-16">
        {highlightText(item.description, searchTerms)}
      </span>
    </main>
  );
}

export default ItemInventory;
