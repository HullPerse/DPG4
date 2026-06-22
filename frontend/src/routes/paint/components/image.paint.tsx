import { getFileUrl } from "@/api/client.api";
import PaintApi from "@/api/paint.api";
import ImageComponent from "@/components/shared/image.component";
import ImageViewer from "@/components/shared/viewer.component";
import { Button } from "@/components/ui/button.component";
import { cn } from "@/lib/index.utils";
import { useUserStore } from "@/store/user.store";
import { PaintType } from "@/types/paint";
import { Trash, ZoomIn } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

const paintApi = new PaintApi();

function ImagePaint({
  item,
  onClick,
}: {
  item: PaintType;
  onClick?: (value: PaintType["author"]) => void;
}) {
  const user = useUserStore((state) => state.user);

  const removeMutation = useMutation({
    mutationFn: () => paintApi.removeDraw(String(item.id)),
  });

  return (
    <main
      style={{
        zIndex: 10000,
        boxShadow: "4px 4px 0 transparent",
        border: "2px solid var(--color-highlight-high)",
        display: "grid",
        gridTemplateRows: "auto 1fr",
      }}
      className="overflow-hidden bg-card text-text transition-none w-60 min-w-60 max-w-60"
    >
      <section className="flex h-10 w-full flex-row items-center justify-between bg-background px-1 select-none border-b-2 border-highlight-high">
        <span
          className={cn(
            "flex item-center text-md font-bold line-clamp-1 w-full",
            onClick && "opacity-75 hover:opacity-100 hover:cursor-pointer",
          )}
          onClick={() => onClick?.(item.author)}
        >
          {item.author.username}
        </span>
        <ImageViewer
          src={[`${getFileUrl(item)}`]}
          zoomable
          draggable
          trigger={
            <Button size="icon" variant="ghost" title="Увеличить" className="ml-auto">
              <ZoomIn />
            </Button>
          }
        />
      </section>
      <section className="relative flex-1 bg-card w-60 h-45">
        <ImageComponent src={`${getFileUrl(item)}`} alt="Картинка ЛОЛ" className="w-60 h-46" />

        {item.author.id === user?.id && (
          <Button
            size="icon"
            variant="error"
            loading={removeMutation.isPending}
            rendered={item.author.id === user?.id}
            onClick={() => removeMutation.mutate()}
          >
            <Trash />
          </Button>
        )}
      </section>
    </main>
  );
}

export default ImagePaint;
