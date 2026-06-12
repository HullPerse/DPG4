import { Dialog, DialogContent } from "@/components/ui/dialog.component";
import { memo, type FC, type ReactNode } from "react";
import type { ModalType } from "@/types/effect";
import type { User } from "@/types/user";
import { WindowHeader } from "../ui/header.window";

type ItemModalProps = {
  label: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  Modal: FC<ModalType>;
  user: User;
  consume: ModalType["consume"];
};

type SimpleModalProps = {
  label: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  body: (close: () => void) => ReactNode;
};

const CreateModal = memo(function CreateModal(
  props: ItemModalProps | SimpleModalProps,
) {
  const { label, open, setOpen } = props;
  const close = () => setOpen(false);

  const content =
    "Modal" in props ? (
      <props.Modal user={props.user} close={close} consume={props.consume} />
    ) : (
      props.body(close)
    );

  return (
    <Dialog open={open} onOpenChange={(value) => setOpen(value)}>
      <DialogContent
        showCloseButton={false}
        className="p-0 border-0 min-w-xl max-w-full"
      >
        <main
          style={{
            zIndex: 10000,
            boxShadow: "4px 4px 0 transparent",
            border: "2px solid var(--color-highlight-high)",
            display: "grid",
            gridTemplateRows: "auto 1fr",
          }}
          className="overflow-hidden bg-card text-text transition-none"
        >
          <WindowHeader title={label} onClose={close} />

          <section className="flex w-full min-h-0 h-full flex-col p-1">
            {open ? content : null}
          </section>
        </main>
      </DialogContent>
    </Dialog>
  );
});

export { CreateModal };
