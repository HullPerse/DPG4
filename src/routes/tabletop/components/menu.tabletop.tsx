import { Button } from "@/components/ui/button.component";
import UserApi from "@/api/user.api";
import { useUserStore } from "@/store/user.store";

const usersApi = new UserApi();

export default function MenuTabletop() {
  const user = useUserStore((state) => state.user);

  return (
    <main className="flex flex-col w-full h-full p-2 bg-background">
      <Button
        onClick={async () => {
          if (!user) return;
          return await usersApi.moveUser(String(user.id), 5);
        }}
      >
        Click here
      </Button>
    </main>
  );
}
