import { ReactNode } from "react";
import { Button } from "../ui/button.component";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

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
    <main className="absolute flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background px-2 font-extrabold text-text">
      {icon}
      <span className="text-center text-xl text-text">{error.message}</span>
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

export function WindowError({
  error,
  icon,
  className,
  button,
  refresh,
}: {
  error: Error;
  icon: ReactNode;
  className?: string;
  button?: boolean;
  refresh?: () => void;
}) {
  return (
    <main
      className={cn(
        "absolute flex h-full w-full flex-col items-center justify-center gap-4 bg-card px-2 font-extrabold text-text",
        className,
      )}
    >
      {icon}
      <span className="text-center text-xl text-text">{error.message}</span>
      {button && (
        <Button variant="default" className="w-md max-w-full" onClick={refresh}>
          Повторить
        </Button>
      )}
    </main>
  );
}
