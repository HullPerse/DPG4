import UserApi from "@/api/user.api";
import { useUserStore } from "@/store/user.store";
import DiceComponent from "@/components/shared/dice.component";

const usersApi = new UserApi();

export default function MenuTabletop() {
  const user = useUserStore((state) => state.user);

  const diceRoll = 6;

  const handleMove = async () => {
    if (!user?.id) return;
    const newPosition = (user.position ?? 0) + diceRoll;
    await usersApi.moveUserAnimated(user.id, newPosition);
  };

  return (
    <main className="flex h-full w-full flex-col bg-background">
      {user?.currentAction === "MOVE_POSITIVE" ||
      user?.currentAction === "MOVE_NEGATIVE" ? (
        <DiceComponent />
      ) : (
        <span className="flex items-center justify-center w-full h-full p-6 text-md font-bold">
          ДЛЯ СЛЕДУЮЩЕГО ХОДА ПРОЙДИТЕ ИГРУ
        </span>
      )}
    </main>
  );
}
