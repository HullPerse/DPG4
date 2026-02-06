import { GlobeX } from "lucide-react";
import { BigError } from "./components/shared/error.component";
import { useUserStore } from "./store/user.store";
import { useNetworkState } from "@uidotdev/usehooks";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

function App() {
  const network = useNetworkState();
  const navigate = useNavigate();

  const isAuth = useUserStore((state) => state.isAuth);

  useEffect(() => {
    if (!isAuth) {
      navigate({
        to: `/auth`,
        replace: true,
      });
    }
  }, [isAuth, navigate]);

  if (!network.online) {
    return (
      <BigError
        error={new Error("Не удалось подключиться к сети")}
        icon={<GlobeX className="animate-pulse size-28 text-red-500" />}
        button
      />
    );
  }

  return (
    <main className="w-screen h-screen text-text bg-background p-2">
      {/* auth */}
      {!isAuth && <main>AAAAA</main>}
    </main>
  );
}

export default App;
