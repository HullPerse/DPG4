import { Dialog, DialogContent } from "@/components/ui/dialog.component";
import { ReactNode } from "react";
import { Button } from "../ui/button.component";
import { X } from "lucide-react";

export function CreateModal({
  label,
  body,
  open,
  setOpen,
}: {
  label: string;
  body?: (close: () => void) => ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => setOpen(value)}>
      <DialogContent showCloseButton={false} className="p-0 border-0 min-w-xl max-w-full">
        <main
          style={{
            zIndex: 999,
            boxShadow: "4px 4px 0 transparent",
            border: "2px solid var(--color-highlight-high)",
            display: "grid",
            gridTemplateRows: "auto 1fr",
          }}
          className="overflow-hidden bg-card text-text transition-none">
          {/* Head */}
          <section className="flex h-10 w-full flex-row items-center justify-between bg-background px-1 select-none border-b-2 border-highlight-high">
            <span className=" flex item-center text-md font-bold line-clamp-1">{label}</span>

            <Button variant="ghost" title="Закрыть" onClick={() => setOpen(false)}>
              <X />
            </Button>
          </section>

          {/* Body */}
          <section className="flex w-full min-h-0 h-full flex-col p-1">
            {body && body(() => setOpen(false))}
          </section>
        </main>
      </DialogContent>
    </Dialog>
  );
}
