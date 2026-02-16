import { useUserStore } from "@/store/user.store";
import { Dice3, PackageCheck, PackagePlus, X } from "lucide-react";

export default function Controls({
  setControls,
}: {
  setControls: (value: boolean) => void;
}) {
  const user = useUserStore((state) => state.user);

  const getAction = () => {
    const actionMap = {
      MOVE: {
        icon: <Dice3 />,
        title: "Кинуть кубик",
        size: "10rem",
      },
      GAMEADD: {
        icon: <PackagePlus />,
        title: "Добавить игру",
        size: "10rem",
      },
      GAMEFINISH: {
        icon: <PackageCheck />,
        title: "Изменить статус игры",
        size: "10rem",
      },
    };

    return actionMap[user?.currentAction as keyof typeof actionMap];
  };

  return (
    <section
      className="absolute top-2 w-[97%] bg-card rounded border-2 border-highlight-high z-50 transition-all duration-300 ease-in-out"
      style={{
        height: getAction().size,
      }}
    >
      <X
        className="absolute top-1 right-1 text-muted hover:text-text hover:cursor-pointer w-4 h-4"
        onClick={() => setControls(false)}
      />

      <section className="flex flex-row w-full h-full items-center p-2"></section>
    </section>
  );
}
