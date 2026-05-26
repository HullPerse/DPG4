import { image } from "@/api/client.api";
import ImageComponent from "@/components/shared/image.component";
import ImageViewer from "@/components/shared/viewer.component";
import { Button } from "@/components/ui/button.component";
import { PaintType } from "@/types/paint";
import { ZoomIn } from "lucide-react";

function ImagePaint({ item }: { item: PaintType }) {
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
        <span className=" flex item-center text-md font-bold line-clamp-1">
          {item.author.username}
        </span>
        <ImageViewer
          src={[`${image.paint}${item.id}/${item.image}`]}
          zoomable
          draggable
          trigger={
            <Button variant="ghost" title="Увеличить">
              <ZoomIn />
            </Button>
          }
        />
      </section>
      <section className="flex-1 bg-card w-60 h-45">
        <ImageComponent
          src={`${image.paint}${item.id}/${item.image}`}
          alt="Картинка ЛОЛ"
          className="w-60 h-46"
        />
      </section>
    </main>
  );
}

export default ImagePaint;
