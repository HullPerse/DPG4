import { Button } from "@/components/ui/button.component";
import { useNotepad } from "@/hooks/notepad.hook";
import { X } from "lucide-react";

export default function NotepadViewerDesktop({
  setOpenNotepad,
}: {
  setOpenNotepad: (value: boolean) => void;
}) {
  const { text, onChange } = useNotepad();

  return (
    <div
      data-notepad="true"
      className="absolute right-12 bottom-2 z-50 flex flex-col border-2 border-highlight-high bg-card shadow-sharp w-80 h-72"
    >
      <section className="flex h-10 w-full flex-row items-center justify-between bg-background px-1 select-none border-b-2 border-highlight-high">
        <span className=" flex item-center text-md font-bold line-clamp-1">
          Блокнот
        </span>

        <Button
          variant="ghost"
          title="Закрыть"
          onClick={() => setOpenNotepad(false)}
        >
          <X />
        </Button>
      </section>
      <textarea
        className="flex-1 w-full p-2 resize-none border-none bg-card text-text text-sm focus:outline-none"
        placeholder="..."
        value={text}
        onChange={(e) => onChange(e.target.value)}
        autoFocus
      />
    </div>
  );
}
