import { memo, useRef, useEffect, useCallback } from "react";
import { Bold, Italic, Underline, Strikethrough } from "lucide-react";
import { useDataStore } from "@/store/data.store";
import { Button } from "@/components/ui/button.component";

function Notebook() {
  const notepad = useDataStore((state) => state.notepad);
  const setNotepad = useDataStore((state) => state.setNotepad);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ start: number; end: number } | null>(null);

  const formatText = useCallback(
    (format: "bold" | "italic" | "underline" | "strikethrough") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = notepad.substring(start, end);
      if (!selectedText) return;

      const formatMap = {
        bold: { prefix: "**", suffix: "**" },
        italic: { prefix: "_", suffix: "_" },
        underline: { prefix: "__", suffix: "__" },
        strikethrough: { prefix: "~~", suffix: "~~" },
      };

      const { prefix, suffix } = formatMap[format];
      const newText =
        notepad.substring(0, start) +
        prefix +
        selectedText +
        suffix +
        notepad.substring(end);

      selectionRef.current = {
        start: start + prefix.length,
        end: end + prefix.length,
      };

      setNotepad(newText);
    },
    [notepad, setNotepad],
  );

  useEffect(() => {
    if (selectionRef.current && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        selectionRef.current.start,
        selectionRef.current.end,
      );
      selectionRef.current = null;
    }
  }, [notepad]);

  return (
    <main className="flex flex-col w-full h-full gap-2 p-2">
      <section className="flex flex-row gap-1 items-center">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => formatText("bold")}
          title="Bold"
          disabled
        >
          <Bold size={18} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => formatText("italic")}
          title="Italic"
          disabled
        >
          <Italic size={18} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => formatText("underline")}
          title="Underline"
          disabled
        >
          <Underline size={18} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => formatText("strikethrough")}
          disabled
          title="Strikethrough"
        >
          <Strikethrough size={18} />
        </Button>
      </section>
      <textarea
        ref={textareaRef}
        autoFocus
        className="flex-1 w-full p-2 resize-none border-2 border-highlight-high bg-card rounded text-text"
        placeholder="..."
        value={notepad}
        onChange={(e) => setNotepad(e.target.value)}
      />
    </main>
  );
}

export default memo(Notebook);
