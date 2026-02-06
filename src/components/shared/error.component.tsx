import { ReactNode } from "react";
import { Button } from "../ui/button.component";
import { useLocation, useNavigate } from "@tanstack/react-router";

export function BigError({
  error,
  icon,
  button,
}: {
  error: Error;
  icon: ReactNode;
  button?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <main className="absolute flex flex-col items-center justify-center h-screen w-screen bg-background text-text font-extrabold gap-4 px-2">
      {icon}
      <span className="text-xl text-text text-center">{error.message}</span>
      {button && (
        <Button
          variant="default"
          className="w-md max-w-full"
          onClick={() => {
            if (location.pathname === "/error")
              return navigate({ to: "/", replace: true });
            return window.location.reload();
          }}
        >
          Повторить
        </Button>
      )}
    </main>
  );
}
