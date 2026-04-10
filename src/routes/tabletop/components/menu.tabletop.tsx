import { Button } from "@/components/ui/button.component";
import UserApi from "@/api/user.api";
import { useUserStore } from "@/store/user.store";

const usersApi = new UserApi();

export default function MenuTabletop() {
  const user = useUserStore((state) => state.user);

  return (
    <main className="flex h-full w-full flex-col bg-background p-2"></main>
  );
}
