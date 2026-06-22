import type { ReactNode } from "react";
import { cn } from "@/lib/index.utils";
import { Button } from "./button.component";
import { X } from "lucide-react";

interface WindowHeaderProps {
  title: string;
  onClose?: () => void;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function WindowHeader({ title, onClose, actions, className, children }: WindowHeaderProps) {
  return (
    <section
      className={cn(
        "flex h-10 w-full flex-row items-center justify-between bg-background px-1 select-none border-b-2 border-highlight-high",
        className,
      )}
    >
      <div className="flex flex-row items-center justify-center gap-2">
        {children}
        <span className="text-md font-bold line-clamp-1">{title}</span>
      </div>
      {actions && <div className="flex flex-row">{actions}</div>}
      {onClose && (
        <Button variant="ghost" title="Закрыть" onClick={onClose}>
          <X />
        </Button>
      )}
    </section>
  );
}
