import { User } from "@/types/user";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, startTransition, useCallback, useState } from "react";
import UserApi from "@/api/user.api";
import { useSubscription } from "@/hooks/subscription.hook";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { EyeIcon, EyeOffIcon, NetworkIcon } from "lucide-react";
import Wheel from "@/components/shared/wheel.component";
import { Button } from "@/components/ui/button.component";

const userApi = new UserApi();

function UsersWheel() {
  const queryClient = useQueryClient();

  const [hiddenItems, setHiddenItems] = useState<string[]>([]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["usersWheel"],
    queryFn: async (): Promise<User[]> => {
      const users = await userApi.getAllUsers();

      if (!users) return [];

      return users;
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["usersWheel"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("users", "*", invalidateQuery);

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

  const visibleItems =
    data?.filter((item) => !hiddenItems.includes(String(item.id))) ?? [];

  return (
    <main className="flex flex-col gap-2 w-full h-full">
      {/* WHEEL */}
      <section className="flex flex-col w-full gap-2 p-2 items-center justify-center">
        <Wheel
          key={hiddenItems.join(",")}
          list={visibleItems.map((user) => ({
            id: String(user.id),
            label: user.username,
            image: user.avatar,
            type: "emoji",
          }))}
          onResult={() => {}}
        />
      </section>
      {/* LIST */}
      <section className="flex h-full w-full flex-col gap-2 overflow-y-auto p-2 items-center border-t-2 border-highlight-high">
        {data?.map((user) => (
          <section
            key={user.id}
            className="relative p-2 flex flex-row w-full min-h-fit h-22 border-2 border-highlight-high items-center"
            style={{
              opacity: hiddenItems.find((h) => h === String(user.id)) && "50%",
            }}
          >
            <span className="min-w-20 min-h-20 w-20 h-20 flex items-center justify-center border-2 border-highlight-high bg-background ">
              {user.avatar}
            </span>

            <div className="flex flex-col ml-2">
              <span className="font-bold text-xl">{user.username}</span>
            </div>
            <div className="ml-auto flex flex-row gap-1">
              <Button
                size="icon"
                onClick={() => {
                  const existingGame =
                    hiddenItems.filter((h) => h === String(user.id)).length > 0;

                  if (!existingGame)
                    return setHiddenItems([...hiddenItems, String(user.id)]);

                  return setHiddenItems(
                    hiddenItems.filter((h) => h !== String(user.id)),
                  );
                }}
              >
                {hiddenItems.find((h) => h === String(user.id)) ? (
                  <EyeIcon size={20} />
                ) : (
                  <EyeOffIcon size={20} />
                )}
              </Button>
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}

export default memo(UsersWheel);
