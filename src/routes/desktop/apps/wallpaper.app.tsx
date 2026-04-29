import { useState, useEffect, ChangeEvent, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button.component";
import { Slider } from "@/components/ui/slider.component";
import { Switch } from "@/components/ui/switch.component";
import { Plus, SlidersHorizontal, RotateCcw } from "lucide-react";
import { SmallLoader } from "@/components/shared/loader.component";
import { WallpaperProps } from "@/types/desktop";
import WallpaperComponent from "../components/wallpaper.component";
import { useDataStore } from "@/store/data.store";

const FILTER_PRESETS = [
  {
    label: "Обычный",
    filters: {
      brightness: 100,
      contrast: 100,
      saturate: 100,
      blur: 0,
      hueRotate: 0,
    },
  },
  {
    label: "Тёмный",
    filters: {
      brightness: 70,
      contrast: 100,
      saturate: 100,
      blur: 0,
      hueRotate: 0,
    },
  },
  {
    label: "Яркий",
    filters: {
      brightness: 130,
      contrast: 110,
      saturate: 120,
      blur: 0,
      hueRotate: 0,
    },
  },
  {
    label: "Сепия",
    filters: {
      brightness: 100,
      contrast: 90,
      saturate: 60,
      blur: 0,
      hueRotate: 30,
    },
  },
  {
    label: "Размытие",
    filters: {
      brightness: 100,
      contrast: 100,
      saturate: 100,
      blur: 5,
      hueRotate: 0,
    },
  },
];

export default function WallpaperApp({
  setWallpaper,
}: {
  setWallpaper: (path: string) => void;
}) {
  const setData = useDataStore((state) => state.setWallpaper);
  const wallpaperFilters = useDataStore((state) => state.wallpaperFilters);
  const setWallpaperFilters = useDataStore(
    (state) => state.setWallpaperFilters,
  );

  const [wallpapers, setWallpapers] = useState<WallpaperProps[]>([]);
  const [wallUrls, setWallUrls] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [compressEnabled, setCompressEnabled] = useState(false);
  const [compressQuality, setCompressQuality] = useState(100);
  const [webpEnabled, setWebpEnabled] = useState(false);

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

  const convertImage = useCallback(
    (dataUrl: string, format: 'jpeg' | 'webp', quality: number): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Failed to get canvas context"));
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL(`image/${format}`, quality / 100));
        };
        img.onerror = reject;
        img.src = dataUrl;
      });
    },
    [],
  );

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
          let dataUrl = event.target?.result as string;

          if (!dataUrl || !dataUrl.startsWith("data:")) {
            throw new Error("Неверный формат данных изображения");
          }

          const timestamp = Date.now();
          let extension = file.name.split(".").pop() || "jpg";

          if (webpEnabled) {
            extension = "webp";
            const quality = compressEnabled ? compressQuality : 100;
            dataUrl = await convertImage(dataUrl, "webp", quality);
          } else if (compressEnabled && compressQuality < 100) {
            dataUrl = await convertImage(dataUrl, "jpeg", compressQuality);
          }

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
    <main className="flex h-full w-full flex-col gap-2 p-2">
      <section className="flex gap-2">
        <Button
          className="h-10 flex-1"
          onClick={() => {
            document.getElementById("imageInput")?.click();
          }}
        >
          <Plus />
        </Button>
        <Button
          className="h-10 w-10"
          variant="default"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal />
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

      {showFilters && (
        <section className="flex flex-col gap-3 rounded border-2 border-highlight-high bg-background p-3 overflow-auto">
          <div className="flex flex-wrap gap-1 items-center">
            <Button
              title="Сбросить"
              size="icon"
              variant="error"
              className="w-8 h-8"
              onClick={() =>
                setWallpaperFilters({
                  brightness: 100,
                  contrast: 100,
                  saturate: 100,
                  blur: 0,
                  hueRotate: 0,
                })
              }
            >
              <RotateCcw className="size-4" />
            </Button>

            {FILTER_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                size="sm"
                variant="link"
                className="text-xs w-22 h-8 border-2 bg-background text-text border-iris hover:bg-iris/20 hover:text-text active:bg-iris/40"
                onClick={() => setWallpaperFilters(preset.filters)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <label className="font-semibold">Яркость</label>
                <span className="text-muted">
                  {wallpaperFilters.brightness}%
                </span>
              </div>
              <Slider
                min={0}
                max={200}
                value={[wallpaperFilters.brightness]}
                onValueChange={(val) =>
                  setWallpaperFilters({
                    brightness: Array.isArray(val) ? val[0] : val,
                  })
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <label className="font-semibold">Контраст</label>
                <span className="text-muted">{wallpaperFilters.contrast}%</span>
              </div>
              <Slider
                min={0}
                max={200}
                value={[wallpaperFilters.contrast]}
                onValueChange={(val) =>
                  setWallpaperFilters({
                    contrast: Array.isArray(val) ? val[0] : val,
                  })
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <label className="font-semibold">Насыщенность</label>
                <span className="text-muted">{wallpaperFilters.saturate}%</span>
              </div>
              <Slider
                min={0}
                max={200}
                value={[wallpaperFilters.saturate]}
                onValueChange={(val) =>
                  setWallpaperFilters({
                    saturate: Array.isArray(val) ? val[0] : val,
                  })
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <label className="font-semibold">Размытие</label>
                <span className="text-muted">{wallpaperFilters.blur}px</span>
              </div>
              <Slider
                min={0}
                max={20}
                value={[wallpaperFilters.blur]}
                onValueChange={(val) =>
                  setWallpaperFilters({
                    blur: Array.isArray(val) ? val[0] : val,
                  })
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <label className="font-semibold">Оттенок</label>
                <span className="text-muted">
                  {wallpaperFilters.hueRotate}°
                </span>
              </div>
              <Slider
                min={0}
                max={360}
                value={[wallpaperFilters.hueRotate]}
                onValueChange={(val) =>
                  setWallpaperFilters({
                    hueRotate: Array.isArray(val) ? val[0] : val,
                  })
                }
              />
            </div>
          </div>
          <div className="border-t-2 pt-2">
            <h4 className="mb-2 text-sm font-semibold">Позиционирование</h4>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm">Размер:</label>
                <select
                  className="rounded border bg-background p-1 text-sm"
                  value={wallpaperFilters.backgroundSize}
                  onChange={(e) =>
                    setWallpaperFilters({ backgroundSize: e.target.value })
                  }
                >
                  <option value="cover">Заполнить</option>
                  <option value="contain">Вместить</option>
                  <option value="auto">Авто</option>
                  <option value="fill">Растянуть</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm">Позиция:</label>
                <select
                  className="rounded border bg-background p-1 text-sm"
                  value={wallpaperFilters.backgroundPosition}
                  onChange={(e) =>
                    setWallpaperFilters({ backgroundPosition: e.target.value })
                  }
                >
                  <option value="center">Центр</option>
                  <option value="top">Сверху</option>
                  <option value="bottom">Снизу</option>
                  <option value="left">Слева</option>
                  <option value="right">Справа</option>
                  <option value="top left">Сверху слева</option>
                  <option value="top right">Сверху справа</option>
                  <option value="bottom left">Снизу слева</option>
                  <option value="bottom right">Снизу справа</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm">Повтор:</label>
                <select
                  className="rounded border bg-background p-1 text-sm"
                  value={wallpaperFilters.backgroundRepeat}
                  onChange={(e) =>
                    setWallpaperFilters({
                      backgroundRepeat: e.target.value as
                        | "no-repeat"
                        | "repeat"
                        | "repeat-x"
                        | "repeat-y",
                    })
                  }
                >
                  <option value="no-repeat">Нет</option>
                  <option value="repeat">Повтор</option>
                  <option value="repeat-x">По горизонтали</option>
                  <option value="repeat-y">По вертикали</option>
                </select>
               </div>
             </div>
           </div>

<div className="border-t-2 pt-2">
              <h4 className="mb-2 text-sm font-semibold">Сжатие при загрузке</h4>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Включить сжатие</label>
                  <Switch
                    checked={compressEnabled}
                    onCheckedChange={setCompressEnabled}
                  />
                </div>
                {compressEnabled && (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <label className="font-semibold">Качество</label>
                      <span className="text-muted">{compressQuality}%</span>
                    </div>
                    <Slider
                      min={1}
                      max={100}
                      value={[compressQuality]}
                      onValueChange={(val) =>
                        setCompressQuality(Array.isArray(val) ? val[0] : val)
                      }
                    />
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-highlight-high">
                  <label className="text-sm">Конвертировать в WebP</label>
                  <Switch
                    checked={webpEnabled}
                    onCheckedChange={setWebpEnabled}
                  />
                </div>
              </div>
            </div>
         </section>
      )}

      <section className="flex w-full cursor-pointer flex-row flex-wrap items-center justify-center gap-2 overflow-auto">
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
