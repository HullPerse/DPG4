import Window from "@/components/shared/window.component";
import { WINDOWS } from "@/config/apps.config";
import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { checkConnection } from "@/api/client.api";

const Signup = lazy(() => import("./components/signup.auth"));
const Signin = lazy(() => import("./components/signin.auth"));
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowProps } from "@/types/window";

export default function Auth() {
  const [register, setRegister] = useState<boolean>(false);

  const { data: serverAvailable = false } = useQuery({
    queryKey: ["serverAvailable"],
    queryFn: checkConnection,
    refetchInterval: 30_000,
    retry: false,
  });

  useEffect(() => {
    if (!serverAvailable && register) {
      setRegister(false);
    }
  }, [serverAvailable, register]);

  return (
    <main onContextMenu={(e) => e.preventDefault()}>
      <Window
        {...(WINDOWS.find((w) => w.id === "auth") as WindowProps)}
        isActive
      >
        <Suspense fallback={<WindowLoader />}>
          {register ? (
            <Signup setRegister={setRegister} />
          ) : (
            <Signin
              setRegister={setRegister}
              serverAvailable={serverAvailable}
            />
          )}
        </Suspense>
      </Window>
    </main>
  );
}
