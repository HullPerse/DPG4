import { Button } from "@/components/ui/button.component";
import UserApi from "@/api/user.api";
import { useUserStore } from "@/store/user.store";

const usersApi = new UserApi();

export default function MenuTabletop() {
  const user = useUserStore((state) => state.user);

  const diceRoll = 3;

  const handleMove = async () => {
    if (!user?.id) return;
    const newPosition = (user.position ?? 0) + diceRoll;
    await usersApi.moveUserAnimated(user.id, newPosition);
  };

  return (
    <main className="flex h-full w-full flex-col bg-background p-2">
      {user?.currentAction === "MOVE" ? (
        <>
          <Button onClick={handleMove}>Move +{diceRoll}</Button>
        </>
      ) : (
        <span className="flex items-center justify-center w-full h-full p-4 text-md font-bold">
          ДЛЯ СЛЕДУЮЩЕГО ХОДА ПРОЙДИТЕ ИГРУ
        </span>
      )}
    </main>
  );
}
