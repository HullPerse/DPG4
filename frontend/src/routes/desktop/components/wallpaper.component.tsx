import Image from "@/components/shared/image.component";
import { Button } from "@/components/ui/button.component";
import { formatBytesToMB } from "@/lib/utils";
import { WallpaperProps } from "@/types/desktop";
import { Trash } from "lucide-react";
import { useState } from "react";

function Wallpaper({
  wallpaper,
  setWallpaper,
  wallUrls,
  deleting,
  handleDelete,
  setData,
}: {
  wallpaper: WallpaperProps;
  setWallpaper: (path: string) => void;
  wallUrls: { [key: string]: string };
  deleting: boolean;
  setData: (name: string) => void;
  handleDelete: ({
    wallpaper,
    e,
  }: {
    wallpaper: WallpaperProps;
    e: React.MouseEvent;
  }) => void;
}) {
  const [isHovering, setIsHovering] = useState(false);
  const sizeMb = formatBytesToMB(wallpaper.size);
  const sizeTitle =
    wallpaper.size && wallpaper.size > 0
      ? `${sizeMb} МБ`
      : undefined;

  return (
    <div
      role="button"
      key={wallpaper.path}
      title={sizeTitle ? `${wallpaper.name} · ${sizeTitle}` : wallpaper.name}
      className="relative h-40 w-48 overflow-hidden rounded border-2 bg-background opacity-85 hover:opacity-100"
      onClick={() => {
        setWallpaper(wallUrls[wallpaper.path]);
        setData(wallpaper.name);
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {wallpaper.path.includes("AppData") && (
        <div className="absolute top-1 left-1 z-50 text-xs border border-highlight-high bg-card min-w-8 w-fit text-center font-bold px-1 py-0.5 opacity-75">
          {wallpaper.name.slice(wallpaper.name.indexOf(".") + 1)}
        </div>
      )}

      <Image
        src={wallUrls[wallpaper.path]}
        alt={wallpaper.name}
        className="h-26 w-full object-contain cursor-pointer"
      />

      <section className="border-t-2 p-1">
        <div className="line-clamp-1 truncate text-center font-bold">
          {wallpaper.name.replace("Default:", "")}
        </div>
        {wallpaper.size !== undefined && wallpaper.size > 0 && (
          <div className="text-center text-xs text-muted">{sizeMb} МБ</div>
        )}
      </section>

      {!wallpaper.name.startsWith("Default:") && isHovering && (
        <Button
          variant="error"
          size="icon"
          className="absolute top-1 right-1"
          onClick={(e) => handleDelete({ wallpaper, e })}
          disabled={deleting}
        >
          <Trash />
        </Button>
      )}
    </div>
  );
}

export default Wallpaper;
