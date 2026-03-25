import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Quote,
  Undo,
  Redo,
  Heading1,
  Heading2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button.component";

const toolbarButtons: {
  icon: React.ReactNode;
  command: string;
  value?: string;
  ariaLabel: string;
}[] = [
  { icon: <Undo />, command: "undo", ariaLabel: "Отменить" },
  { icon: <Redo />, command: "redo", ariaLabel: "Повторить" },
  { icon: <Bold />, command: "bold", ariaLabel: "Жирный" },
  { icon: <Italic />, command: "italic", ariaLabel: "Курсив" },
  { icon: <Underline />, command: "underline", ariaLabel: "Подчёркнутый" },
  {
    icon: <Strikethrough />,
    command: "strikeThrough",
    ariaLabel: "Зачёркнутый",
  },
  {
    icon: <Heading1 />,
    command: "formatBlock",
    value: "h2",
    ariaLabel: "Заголовок 1",
  },
  {
    icon: <Heading2 />,
    command: "formatBlock",
    value: "h3",
    ariaLabel: "Заголовок 2",
  },
  {
    icon: <Quote />,
    command: "formatBlock",
    value: "blockquote",
    ariaLabel: "Цитата",
  },
];

export function RichTextEditor({
  value,
  onChange,
  className,
  placeholder = "Напишите ваш отзыв здесь...",
}: {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertText", false, "    ");
    }
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col rounded border-2 border-highlight-high bg-card overflow-hidden",
        isFocused && "border-primary",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b-2 border-highlight-high bg-muted/50 p-2">
        {toolbarButtons.map((btn, index) => (
          <Button
            key={index}
            variant="ghost"
            size="icon"
            className="size-8 opacity-70 hover:opacity-100"
            onClick={() => execCommand(btn.command, btn.value)}
            title={btn.ariaLabel}
            type="button"
          >
            {btn.icon}
          </Button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        className={cn(
          "min-h-48 flex-1 p-3 outline-none prose prose-sm max-w-none dark:prose-invert",
          "text-text empty:before:content-[attr(data-placeholder)] empty:before:text-muted",
          "[&_br]:hidden [&_div]:min-h-6",
          "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-4",
          "[&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:mt-3",
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
          "[&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic",
          "[&_strong]:font-bold [&_em]:italic [&_u]:underline [&_s]:line-through",
        )}
        data-placeholder={placeholder}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
      />
    </div>
  );
}
