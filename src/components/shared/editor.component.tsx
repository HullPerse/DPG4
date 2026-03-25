import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Quote,
  Heading1,
  Heading2,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button.component";

type Command = {
  icon: React.ReactNode;
  action: (selection: Selection) => void;
  ariaLabel: string;
};

const createFormatAction = (tag: string): ((selection: Selection) => void) => {
  return (selection: Selection) => {
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const wrapper = document.createElement(tag);

    try {
      range.surroundContents(wrapper);
    } catch {
      const fragment = range.extractContents();
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);
    }

    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    selection.addRange(newRange);
  };
};

const createBlockAction = (tag: string): ((selection: Selection) => void) => {
  return (selection: Selection) => {
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    let block = range.commonAncestorContainer.parentElement;

    while (block && block.parentElement !== document.body) {
      if (block.tagName === "DIV" || block.tagName === "P") break;
      block = block.parentElement;
    }

    if (block) {
      const newBlock = document.createElement(tag);
      const fragment = range.extractContents();
      newBlock.appendChild(fragment);
      block.parentNode?.replaceChild(newBlock, block);

      const newRange = document.createRange();
      newRange.selectNodeContents(newBlock);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  };
};

const toolbarButtons: Command[] = [
  {
    icon: <Bold />,
    action: createFormatAction("strong"),
    ariaLabel: "Жирный",
  },
  {
    icon: <Italic />,
    action: createFormatAction("em"),
    ariaLabel: "Курсив",
  },
  {
    icon: <Underline />,
    action: createFormatAction("u"),
    ariaLabel: "Подчёркнутый",
  },
  {
    icon: <Strikethrough />,
    action: createFormatAction("s"),
    ariaLabel: "Зачёркнутый",
  },
  {
    icon: <Heading1 />,
    action: createBlockAction("h2"),
    ariaLabel: "Заголовок 1",
  },
  {
    icon: <Heading2 />,
    action: createBlockAction("h3"),
    ariaLabel: "Заголовок 2",
  },
  {
    icon: <Quote />,
    action: createBlockAction("blockquote"),
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleAction = useCallback((command: Command) => {
    const selection = window.getSelection();
    if (selection) {
      command.action(selection);
      handleInput();
      editorRef.current?.focus();
    }
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editorRef.current) return;

      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        const img = document.createElement("img");
        img.src = reader.result as string;
        img.className = "max-w-full h-auto my-2 rounded";
        img.style.maxWidth = "100%";

        const selection = window.getSelection();
        if (selection?.rangeCount) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(img);

          const newRange = document.createRange();
          newRange.setStartAfter(img);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else if (editorRef.current) {
          editorRef.current.appendChild(img);
        }

        handleInput();
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [handleInput],
  );

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
            onClick={() => handleAction(btn)}
            title={btn.ariaLabel}
            type="button"
          >
            {btn.icon}
          </Button>
        ))}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-8 opacity-70 hover:opacity-100"
          onClick={() => fileInputRef.current?.click()}
          title="Добавить изображение"
          type="button"
        >
          <ImageIcon />
        </Button>
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
        suppressContentEditableWarning
      />
    </div>
  );
}
