import ItemsApi from "@/api/items.api";
import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import HangMan from "@/components/svg/handgman.component";
import { Item } from "@/types/items";
import { useQuery } from "@tanstack/react-query";
import { CircleX } from "lucide-react";
import { useState } from "react";

const itemsApi = new ItemsApi();

function WordleTab() {
  const [errors, setErrors] = useState<string[]>([]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["wordleTab"],
    queryFn: async (): Promise<Item["label"]> => {
      return await itemsApi.getRandomItem().then((res) => res.label);
    },
  });

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка при соединении с сервером")}
        icon={<CircleX className="size-28 animate-pulse text-red-500" />}
      />
    );

  return (
    <main className="flex flex-col w-full h-full gap-2 p-2">
      <section className="flex flex-1 bg-background border-2 border-highlight-high p-2 items-center justify-center">
        <HangMan wrongLetters={errors} />
      </section>
      <section
        className="mt-auto flex w-full h-30"
        onClick={() => setErrors((prev) => [...prev, "a"])}
      >
        2
      </section>
    </main>
  );
}

export default WordleTab;
