import UserApi from "@/api/user.api";
import { useUserStore } from "@/store/user.store";
import DiceComponent from "@/components/shared/dice.component";
import { useState } from "react";
import { Input } from "@/components/ui/input.component";

const usersApi = new UserApi();

export default function MenuTabletop() {
  const user = useUserStore((state) => state.user);

  const [additional, setAdditional] = useState<string>("");

  const handleMove = async (dice: number) => {
    if (!user?.id) return;
    const newPosition = (user.position ?? 0) + dice;
    await usersApi.moveUserAnimated(user.id, newPosition);
  };

  return (
    <main className="flex h-full w-full flex-col bg-background">
      {user?.currentAction === "MOVE_POSITIVE" ||
      user?.currentAction === "MOVE_NEGATIVE" ? (
        <div className="flex flex-col w-full p-2">
          <DiceComponent
            minDice={user.currentDice}
            action={user.currentAction}
            handleMove={handleMove}
            additional={additional}
          />
          <Input
            type="number"
            value={additional}
            onChange={(e) => setAdditional(e.target.value)}
            placeholder="Доп. значение к кубику"
            arrows
          />
        </div>
      ) : (
        <span className="flex items-center justify-center w-full h-full p-6 text-md font-bold">
          ДЛЯ СЛЕДУЮЩЕГО ХОДА ПРОЙДИТЕ ИГРУ
        </span>
      )}
    </main>
  );
}
