import { getFileUrl } from "@/api/client.api";
import ImageComponent from "@/components/shared/image.component";
import { Button } from "@/components/ui/button.component";
import { Dialog, DialogContent } from "@/components/ui/dialog.component";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover.component";
import { useUserStore } from "@/store/user.store";
import { Item } from "@/types/items";
import { UseMutationResult } from "@tanstack/react-query";
import { X } from "lucide-react";

function StatusInventory({
  removeStatus,
  setRemoveStatus,
  activeStatus,
  setActiveStatus,
  statusMutation,
  currentId,
  statuses,
}: {
  removeStatus: boolean;
  setRemoveStatus: (value: boolean) => void;
  activeStatus: string;
  setActiveStatus: (value: string) => void;
  statusMutation: UseMutationResult<void, Error, string, unknown>;
  currentId: string;
  statuses: Item[];
}) {
  const user = useUserStore((state) => state.user);

  return (
    <main className="flex flex-wrap justify-start w-full min-h-30 max-h-30 h-30 p-1 gap-2 border-b-2 border-highlight-high overflow-y-auto">
      <Dialog
        open={removeStatus}
        onOpenChange={(value) => setRemoveStatus(value)}
      >
        <DialogContent
          showCloseButton={false}
          className="p-0 border-0 min-w-xl max-w-full"
        >
          <section
            style={{
              zIndex: 999,
              boxShadow: "4px 4px 0 transparent",
              border: "2px solid var(--color-highlight-high)",
              display: "grid",
              gridTemplateRows: "auto 1fr",
            }}
            className="overflow-hidden bg-card text-text transition-none"
          >
            {/* Head */}
            <section className="flex h-10 w-full flex-row items-center justify-between bg-background px-1 select-none border-b-2 border-highlight-high">
              <span className=" flex item-center text-md font-bold line-clamp-1">
                Удалить статус {activeStatus} ?
              </span>

              <Button
                variant="ghost"
                title="Закрыть"
                onClick={() => setRemoveStatus(false)}
              >
                <X />
              </Button>
            </section>

            {/* Body */}
            <section className="flex w-full min-h-0 h-full flex-col p-1">
              <Button
                variant="error"
                loading={statusMutation.isPending}
                disabled={currentId !== user?.id}
                onClick={() => statusMutation.mutate(activeStatus)}
              >
                УДАЛИТЬ
              </Button>
            </section>
          </section>
        </DialogContent>
      </Dialog>

      {statuses.map((status, index) => (
        <HoverCard key={index}>
          <HoverCardTrigger
            delay={300}
            className="relative flex flex-col min-w-26 min-h-26 w-26 h-26 overflow-hidden border-2 border-highlight-high shadow-sharp-sm bg-background items-center p-1"
            style={{
              cursor: user?.id === currentId ? "pointer" : "default",
            }}
            onClick={() => {
              if (currentId === user?.id) {
                setActiveStatus(status.label);
                setRemoveStatus(true);
              }
            }}
          >
            <span className="text-xs font-bold line-clamp-2 text-center h-10">
              {status.label}
            </span>

            <ImageComponent
              src={`${getFileUrl(status)}`}
              alt={status.label}
              className="min-w-14 w-14 min-h-14 h-14 border border-highlight-high"
              type="cover"
            />
          </HoverCardTrigger>
          <HoverCardContent
            className="z-9999 flex flex-col gap-1 shadow-sharp-sm border-2 border-highlight-high h-30 max-h-30 mi-h-30 min-w-full w-sm  overflow-y-auto"
            side="top"
          >
            <span>{status.description}</span>
          </HoverCardContent>
        </HoverCard>
      ))}
    </main>
  );
}

export default StatusInventory;
