import Image from "@/components/shared/image.component";
import { formatBytesToMB } from "@/lib/utils";

export function WallpaperUploadPlaceholder({
  previewUrl,
  fileName,
  fileSizeBytes,
  progress,
  stage,
}: {
  previewUrl: string;
  fileName: string;
  fileSizeBytes?: number;
  progress: number;
  stage: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));
  const sizeMb = formatBytesToMB(fileSizeBytes);

  return (
    <div
      className="border-primary/50 bg-background relative h-40 w-48 overflow-hidden rounded border-2 shadow-sharp-sm"
      title={
        fileSizeBytes
          ? `${fileName} · ${sizeMb} МБ`
          : fileName
      }
      aria-busy="true"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      role="progressbar"
    >
      <div className="border-highlight-high bg-card absolute top-1 left-1 z-50 w-fit min-w-8 border px-1 py-0.5 text-center text-xs font-bold opacity-90">
        Загрузка
      </div>

      <div className="bg-highlight-low relative h-26 w-full">
        <Image
          src={previewUrl}
          alt={fileName}
          className="h-26 w-full object-contain opacity-50"
        />
        <div className="bg-background/75 absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="text-primary text-2xl font-bold tabular-nums">
            {clamped}%
          </span>
          <span className="text-muted px-2 text-center text-xs">{stage}</span>
        </div>
      </div>

      <section className="border-t-2 p-1">
        <div className="line-clamp-1 truncate text-center font-bold">
          {fileName}
        </div>
        {fileSizeBytes !== undefined && fileSizeBytes > 0 && (
          <div className="text-center text-xs text-muted">{sizeMb} МБ</div>
        )}
        <div className="bg-highlight-medium mt-1.5 h-1.5 w-full overflow-hidden">
          <div
            className="bg-primary h-full transition-[width] duration-200 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>
      </section>
    </div>
  );
}
