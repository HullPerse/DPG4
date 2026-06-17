// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { Plus, Gift, Trash2, Award, NetworkIcon } from "lucide-react";
// import { useState } from "react";

import { useUserStore } from "@/store/user.store";
import { Item } from "@/types/items";
import { Quest } from "@/types/quests";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import QuestsApi, { type QuestReward } from "@/api/quests.api";
import ItemsApi from "@/api/items.api";
import { useSubscription } from "@/hooks/subscription.hook";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon, Plus } from "lucide-react";
import { CreateModal } from "@/components/shared/items.modal";
import { Button } from "@/components/ui/button.component";
import CreateQuest from "../components/create.quest";

const questsApi = new QuestsApi();
const itemsApi = new ItemsApi();

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

  useSubscription("quests", "*", () => {
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
          const claimMutation = useMutation({
            mutationFn: () => questsApi.claim(item.id, String(user?.id)),
            onSuccess: () =>
              queryClient.invalidateQueries({ queryKey: ["quests"] }),
          });

          return (
            <div
              key={item.id}
              className="flex flex-row gap-2 p-3 border-2 border-highlight-high bg-card"
            >
              <div className="flex flex-col w-full items-start overflow-hidden">
                <span className="ml-2 font-bold text-xl">{item.label}</span>
                <span className="ml-2 text-sm font-light text-muted truncate line-clamp-1">
                  {item.description}
                </span>
              </div>

              <div className="flex flex-row gap-1">
                <Button
                  variant="success"
                  loading={claimMutation.isPending}
                  onClick={() => claimMutation.mutate()}
                  disabled={item.claimed.includes(String(user?.id))}
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
