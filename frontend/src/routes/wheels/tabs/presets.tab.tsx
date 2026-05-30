import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, startTransition, useCallback, useState } from "react";
import { useSubscription } from "@/hooks/subscription.hook";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { EyeIcon, EyeOffIcon, NetworkIcon } from "lucide-react";
import Wheel from "@/components/shared/wheel.component";
import { Button } from "@/components/ui/button.component";
import GameApi from "@/api/games.api";
import { Preset } from "@/types/games";
import ImageComponent from "@/components/shared/image.component";

const gameApi = new GameApi();

function PresetsWheel() {
  const queryClient = useQueryClient();

  const [hiddenItems, setHiddenItems] = useState<string[]>([]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["presetsWheel"],
    queryFn: async (): Promise<Preset[]> => {
      const presets = await gameApi.getPresets();

      if (!presets) return [];

      return presets;
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["presetsWheel"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("presets", "*", invalidateQuery);

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
          list={visibleItems.map((preset) => ({
            id: String(preset.id),
            label: preset.label,
            image:
              preset.games[
                Math.floor(Math.random() * (preset.games?.length ?? 0) * 1)
              ].capsuleImage,
            type: "image",
          }))}
          onResult={() => {}}
          free
        />
      </section>
      {/* LIST */}
      <section className="flex h-full w-full flex-col gap-2 overflow-y-auto p-2 items-center border-t-2 border-highlight-high">
        {data?.map((preset) => (
          <section
            key={preset.id}
            className="relative p-2 flex flex-row w-full min-h-fit h-22 border-2 border-highlight-high items-center"
            style={{
              opacity:
                hiddenItems.find((h) => h === String(preset.id)) && "50%",
            }}
          >
            <div className="flex h-full w-40 aspect-video border-2 border-highlight-high overflow-hidden">
              {preset.games?.length > 0 && (
                <ImageComponent
                  src={
                    preset.games[
                      Math.floor(
                        Math.random() * (preset.games?.length ?? 0) * 1,
                      )
                    ].capsuleImage
                  }
                  alt={preset.label}
                />
              )}
            </div>

            <div className="flex flex-col ml-2">
              <span className="font-bold text-xl">{preset.label}</span>
            </div>
            <div className="ml-auto flex flex-row gap-1">
              <Button
                size="icon"
                onClick={() => {
                  const existingGame =
                    hiddenItems.filter((h) => h === String(preset.id)).length >
                    0;

                  if (!existingGame)
                    return setHiddenItems([...hiddenItems, String(preset.id)]);

                  return setHiddenItems(
                    hiddenItems.filter((h) => h !== String(preset.id)),
                  );
                }}
              >
                {hiddenItems.find((h) => h === String(preset.id)) ? (
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

export default memo(PresetsWheel);
