import { Chat } from "@/types/chat";
import { User } from "@/types/user";
import { cn } from "@/lib/utils";
import ImageComponent from "./image.component";
import { image } from "@/api/client.api";
import { Trash } from "lucide-react";

interface ChatBubbleProps {
  item: Chat;
  currentUser: User | null;
  onEdit?: (message: Chat) => void;
  onRemove?: (message: Chat) => void;
}

export default function ChatBubble({
  item,
  currentUser,
  onEdit,
  onRemove,
}: ChatBubbleProps) {
  const sender = item.data.sender;
  const isAuthor =
    sender.username === currentUser?.username || sender.id === currentUser?.id;

  const senderColor = isAuthor ? currentUser?.color : sender.color;
  const senderAvatar = isAuthor ? currentUser?.avatar : sender.avatar;

  const isEdited = item.created !== item.updated;

  return (
    <main
      className={`flex h-full min-w-30  w-full gap-2  ${isAuthor ? "justify-end" : "justify-start"}`}
    >
      <div
        className={cn(
          "flex flex-col max-w-[70%] min-w-64  gap-1 px-3 py-2 border-2",
          isAuthor ? "bg-iris/20" : "bg-background",
          item.image && "min-h-40",
        )}
        style={{
          borderColor:
            senderColor ||
            (isAuthor ? undefined : "var(--color-highlight-high)"),
        }}
      >
        <span className="text-sm text-text text-end font-bold">
          {sender.username}
        </span>

        {item.image && (
          <section className="mt-1 flex w-full h-full ">
            <ImageComponent
              src={`${image.chat}${item.id}/${item.image}`}
              alt={item.message || "Изображение"}
              type="contain"
              className="h-full w-full"
            />
          </section>
        )}

        {item.message && (
          <span className="text-sm text-text wrap-break-word">
            {item.message}
          </span>
        )}

        <section className="flex flex-row items-center gap-1 text-xs text-muted w-full">
          <span>
            {new Date(item.created).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          {isEdited && (
            <span className="italic">
              (изм.{" "}
              {new Date(item.updated).toLocaleString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              )
            </span>
          )}

          {isAuthor && onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="ml-2 text-muted hover:text-text underline cursor-pointer"
            >
              Изменить
            </button>
          )}
          {isAuthor && onRemove && (
            <button
              onClick={() => onRemove(item)}
              className="ml-auto text-muted hover:text-red-500/40 underline cursor-pointer"
            >
              <Trash className="size-4" />
            </button>
          )}
        </section>
      </div>
      <span
        className="flex items-center justify-center text-xl w-10 h-10 border-2 self-end"
        style={{
          borderColor: senderColor || "var(--color-highlight-high)",
        }}
      >
        {senderAvatar}
      </span>
    </main>
  );
}
