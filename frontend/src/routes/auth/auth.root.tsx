import Window from "@/components/shared/window.component";
import { WINDOWS } from "@/config/apps.config";
import { lazy, Suspense, useState } from "react";

const Signup = lazy(() => import("./components/signup.auth"));
const Signin = lazy(() => import("./components/signin.auth"));
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowProps } from "@/types/window";

export default function Auth() {
  const [register, setRegister] = useState<boolean>(false);

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
            <Signin setRegister={setRegister} />
          )}
        </Suspense>
      </Window>
    </main>
  );
}
