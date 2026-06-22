import { useUserStore } from "@/store/user.store";
import { Item } from "@/types/items";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import QuestsApi from "@/api/quests.api";
import ItemsApi from "@/api/items.api";
import { useSubscription } from "@/hooks/index.hook";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon, Plus } from "lucide-react";
import { CreateModal } from "@/components/shared/items.modal";
import { Button } from "@/components/ui/button.component";
import { cn } from "@/lib/index.utils";
import CreateQuest from "../components/create.quest";

const questsApi = new QuestsApi();
const itemsApi = new ItemsApi();

function getItemLabel(items: Item[], id: string): string {
  return items.find((i) => i.id === id)?.label ?? id;
}

function QuestsTab() {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [open, setOpen] = useState<boolean>(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["quests"],
    queryFn: async () => {
      const quests = await questsApi.getAll();
      const items = await itemsApi.getAllItems();

      return { quests, items };
    },
  });

  const claimMutation = useMutation({
    mutationFn: ({ questId, userId }: { questId: string; userId: string }) =>
      questsApi.claim(questId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quests"] });
    },
  });

  useSubscription("quests", () => {
    queryClient.invalidateQueries({ queryKey: ["quests"] });
  });

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Ошибка загрузки заданий")}
        icon={<NetworkIcon />}
        refresh={refetch}
        button
      />
    );

  return (
    <main className="flex flex-col gap-2 p-2 w-full">
      <CreateModal
        label="Добавить задание"
        body={() =>
          CreateQuest({
            items: data?.items ?? [],
            onClose: () => {
              setOpen(false);
            },
          })
        }
        open={!!open}
        setOpen={(prev) => {
          if (!prev) setOpen(false);
        }}
      />

      <Button
        rendered={user?.isAdmin}
        className="w-full h-10 flex flex-row gap-1"
        variant="success"
        onClick={() => {
          if (!user?.isAdmin) return;
          else return setOpen(true);
        }}
        disabled={open}
      >
        <Plus />
      </Button>

      <section className="flex flex-col gap-2 w-full h-full">
        {data?.quests?.map((item) => {
          const isClaimed = item.claimed.includes(String(user?.id));

          return (
            <div
              key={item.id}
              className={cn(
                "flex flex-row gap-2 p-3 border-2 border-highlight-high bg-card",
                isClaimed && "opacity-80",
              )}
            >
              <div className="flex flex-col w-full items-start overflow-hidden gap-1">
                <span className="font-bold text-xl">{item.label}</span>
                <span className="text-sm font-light text-muted truncate line-clamp-1">
                  {item.description}
                </span>

                {item.reward.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.reward.map((reward, i) => (
                      <span
                        key={i}
                        className="text-xs font-bold px-2 py-0.5 border border-iris text-iris"
                      >
                        {reward.type === "money"
                          ? `+${reward.value} чубриков`
                          : `Предмет: ${getItemLabel(data.items, String(reward.value))}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-row gap-1 items-center">
                <Button
                  variant="success"
                  loading={claimMutation.isPending}
                  disabled={isClaimed}
                  onClick={() =>
                    claimMutation.mutate({
                      questId: item.id,
                      userId: String(user?.id),
                    })
                  }
                >
                  ЗАБРАТЬ
                </Button>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}

export default QuestsTab;
