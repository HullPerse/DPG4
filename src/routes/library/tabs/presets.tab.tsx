import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { useQuery } from "@tanstack/react-query";
import { NetworkIcon, Plus } from "lucide-react";
import { memo, useState } from "react";

import GameApi from "@/api/games.api";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { useUserStore } from "@/store/user.store";

const gameApi = new GameApi();

function PresetsTab() {
  const isAdmin = useUserStore((state) => state.isAdmin);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["presets"],
    queryFn: async () => {
      return await gameApi.getPresets();
    },
  });

  const [searchTerm, setSearchTerm] = useState("");

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

  return (
    <main className="relative flex flex-col w-full h-full">
      {isAdmin && (
        <Button className="absolute right-2 bottom-2 rounded-full border w-8 h-8">
          <Plus />
        </Button>
      )}

      <Input
        className="border-primary"
        placeholder="Найти пресет"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <section className="flex flex-col">
        {/*{data
          ?.filter((preset) =>
            preset.label.toLowerCase().includes(searchTerm.toLowerCase()),
          )
          .map((preset) => (
            <div key={preset.id}>{preset.label}</div>
          ))}*/}
      </section>
    </main>
  );
}

export default memo(PresetsTab);
