import { SmallLoader } from "@/components/shared/loader.component";
import { Button } from "@/components/ui/button.component";
import { Combobox } from "@/components/ui/combobox.component";
import { Inventory } from "@/types/items";
import { Send, ShoppingCart, Trash, X } from "lucide-react";
import { ItemLoadingType } from "../../tabs/inventory.tab";
import { Input } from "@/components/ui/input.component";
import { useUserStore } from "@/store/user.store";
import { UseMutationResult } from "@tanstack/react-query";
import { User } from "@/types/user";
import { useState } from "react";

function ActionInventory({
  item,
  itemMutation,
  itemLoading,
  price,
  setPrice,
  setActive,
  users,
  currentId,
}: {
  item: Inventory;
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
  price: string;
  setPrice: (value: string) => void;
  setActive: (value: number | null) => void;
  users: User[];
  currentId: string;
}) {
  const user = useUserStore((state) => state.user);

  const [selectedUser, setSelectedUser] = useState<string | undefined>(
    undefined,
  );

  return (
    <main
      key={item.id}
      className="relative flex flex-col min-w-64 min-h-64 w-64 h-64 overflow-hidden border-2 border-highlight-high shadow-sharp-sm bg-background items-center p-2"
    >
      {itemLoading(String(item.id), "use") && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
          <SmallLoader size={28} />
        </div>
      )}
      <Button
        size="icon"
        variant="error"
        className="absolute top-1 right-1"
        onClick={() => {
          setPrice("");
          setActive(null);
        }}
      >
        <X />
      </Button>
      <section className="flex flex-col w-full mt-auto gap-1">
        <div className="flex flex-row gap-2 w-full items-center">
          <Combobox
            options={users.map((u) => {
              return {
                label: u.username,
                value: String(u.id),
                style: { color: u.color },
              };
            })}
            value={selectedUser}
            onChange={setSelectedUser}
            placeholder={selectedUser || "Пользователь"}
            className="w-64"
            loading={itemLoading(String(item.id), "send")}
          />
          <Button
            disabled={itemLoading(String(item.id), "send") || !selectedUser}
            onClick={() => {
              if (!selectedUser) return;

              itemMutation.mutate({
                type: "send",
                itemId: String(item.id),
                userId: selectedUser,
              });
            }}
            className="my-1"
            size="icon"
          >
            {itemLoading(String(item.id), "send") ? <SmallLoader /> : <Send />}
          </Button>
        </div>
        <div
          className="flex flex-row gap-2 w-full items-center"
          hidden={currentId !== user?.id}
        >
          <Input
            type="number"
            placeholder="Продажа"
            className="h-9"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            arrows
            arrowsGap="0px"
            min={0}
            max={9999}
          />
          <Button
            size="icon"
            variant="info"
            onClick={() =>
              itemMutation.mutate({
                type: "sell",
                itemId: String(item.id),
                owner: item.owner,
                price: Number(price),
              })
            }
            disabled={itemLoading(String(item.id), "sell") || !price}
          >
            {itemLoading(String(item.id), "sell") ? (
              <SmallLoader />
            ) : (
              <ShoppingCart />
            )}
          </Button>
        </div>
        <div className="flex flex-row gap-2 w-full items-center">
          {item.type !== "rat" && (
            <Button
              variant="success"
              className="flex-1"
              onClick={() =>
                itemMutation.mutate({
                  type: "use",
                  itemId: String(item.id),
                })
              }
              hidden={currentId !== user?.id}
              disabled={itemLoading(String(item.id), "use")}
            >
              {itemLoading(String(item.id), "use") ? (
                <SmallLoader />
              ) : (
                "Использовать"
              )}
            </Button>
          )}
          <Button
            size="icon"
            variant="error"
            style={{
              width:
                currentId !== user?.id || item.type === "rat"
                  ? "100%"
                  : undefined,
            }}
            onClick={() =>
              itemMutation.mutate({
                type: "delete",
                itemId: String(item.id),
              })
            }
            disabled={itemLoading(String(item.id), "delete")}
          >
            {itemLoading(String(item.id), "delete") ? (
              <SmallLoader />
            ) : (
              <Trash />
            )}
          </Button>
        </div>
      </section>
    </main>
  );
}

export default ActionInventory;
