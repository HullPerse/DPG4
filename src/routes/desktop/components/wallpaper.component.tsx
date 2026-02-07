import { Image } from "@/components/shared/image.component";
import { Button } from "@/components/ui/button.component";
import { WallpaperProps } from "@/types/desktop";
import { Trash } from "lucide-react";
import { memo, useState } from "react";

function Wallpaper({
  wallpaper,
  setWallpaper,
  wallUrls,
  deleting,
  handleDelete,
}: {
  wallpaper: WallpaperProps;
  setWallpaper: (path: string) => void;
  wallUrls: { [key: string]: string };
  deleting: boolean;
  handleDelete: ({
    wallpaper,
    e,
  }: {
    wallpaper: WallpaperProps;
    e: React.MouseEvent;
  }) => void;
}) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      key={wallpaper.path}
      className="relative h-36 w-48 bg-background border-2 rounded overflow-hidden"
      onClick={() => setWallpaper(wallUrls[wallpaper.path])}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Image
        src={wallUrls[wallpaper.path]}
        alt={wallpaper.name}
        className="w-full h-26 object-contain"
      />

      <section className="border-t-2 p-1">
        <div className="line-clamp-1 truncate font-bold text-center">
          {wallpaper.name.replace("Default:", "")}
        </div>
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

export default memo(Wallpaper);
