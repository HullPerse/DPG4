import { useState, useEffect, ChangeEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button.component";
import { Plus } from "lucide-react";
import { SmallLoader } from "@/components/shared/loader.component";
import { WallpaperProps } from "@/types/desktop";
import WallpaperComponent from "../components/wallpaper.component";
import { useDataStore } from "@/store/data.store";

export default function WallpaperApp({
  setWallpaper,
}: {
  setWallpaper: (path: string) => void;
}) {
  const setData = useDataStore((state) => state.setWallpaper);

  const [wallpapers, setWallpapers] = useState<WallpaperProps[]>([]);
  const [wallUrls, setWallUrls] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadWallpapers = async () => {
    try {
      const walls = await invoke<WallpaperProps[]>("get_wallpapers");
      setWallpapers(walls);

      const urls: { [key: string]: string } = {};
      for (const wall of walls) {
        const dataUrl = await invoke<string>("get_wallpaper_data", {
          path: wall.path,
        });
        urls[wall.path] = dataUrl;
      }

      setWallUrls(urls);
    } catch (error) {
      console.error("Failed to load wallpapers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallpapers();
  }, []);

  const handleDelete = async ({
    wallpaper,
    e,
  }: {
    wallpaper: WallpaperProps;
    e: React.MouseEvent;
  }) => {
    e.stopPropagation();

    if (wallpaper.name.startsWith("Default:")) {
      return alert("Нельзя удалить стандартные обои");
    }

    setDeleting(true);
    try {
      await invoke("delete_wallpaper", { path: wallpaper.path });

      setWallpapers((prev) => prev.filter((w) => w.path !== wallpaper.path));
      setWallUrls((prev) => {
        const newUrls = { ...prev };
        delete newUrls[wallpaper.path];
        return newUrls;
      });
    } catch (error) {
      console.error(error);
      alert("Не удалось удалить обои");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/webp",
    ];
    if (!validTypes.includes(file.type)) {
      alert(
        "Пожалуйста, выберите файл изображения (JPEG, PNG, GIF, BMP или WebP)",
      );
      e.target.value = "";
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert("Размер файла должен быть меньше 10 МБ");
      e.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const dataUrl = event.target?.result as string;

          if (!dataUrl || !dataUrl.startsWith("data:")) {
            throw new Error("Неверный формат данных изображения");
          }

          const timestamp = Date.now();
          const extension = file.name.split(".").pop() || "jpg";
          const fileName = `custom_${timestamp}.${extension}`;

          await invoke<string>("save_wallpaper", {
            fileName,
            data: dataUrl,
          });

          e.target.value = "";

          setLoading(true);
          await loadWallpapers();
          setUploading(false);
        } catch (error) {
          console.error(error);
          alert("Не удалось сохранить обои. Пожалуйста, попробуйте еще раз.");
          setLoading(false);
        }
      };

      reader.onerror = () => {
        console.error("FileReader error");
        alert("Ошибка чтения файла");
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      alert("Ошибка загрузки обоев");
      setUploading(false);
    }
  };

  return (
    <main className="flex h-full w-full flex-col gap-2 overflow-auto p-2">
      <section>
        <Button
          className="h-16 w-full"
          onClick={() => {
            document.getElementById("imageInput")?.click();
          }}
        >
          <Plus />
        </Button>
        <input
          id="imageInput"
          type="file"
          className="hidden"
          accept="image/jpeg, image/png, image/gif, image/bmp, image/webp, image/jpg"
          onChange={handleUpload}
          disabled={uploading}
        />
      </section>

      <section className="flex w-full cursor-pointer flex-row flex-wrap items-center justify-center gap-2">
        {wallpapers.map((wallpaper) => {
          if (loading)
            return (
              <div
                key={wallpaper.path}
                className="relative h-36 w-48 overflow-hidden rounded border-2 bg-background"
              >
                <div className="flex h-full w-full items-center justify-center">
                  <SmallLoader />
                </div>
              </div>
            );
          return (
            <WallpaperComponent
              key={wallpaper.path}
              wallpaper={wallpaper}
              setWallpaper={setWallpaper}
              wallUrls={wallUrls}
              deleting={deleting}
              handleDelete={handleDelete}
              setData={setData}
            />
          );
        })}
      </section>
    </main>
  );
}
