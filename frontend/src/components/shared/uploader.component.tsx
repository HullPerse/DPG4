import { memo } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { cn } from "@/lib/index.utils";
import { Button } from "../ui/button.component";
import Image from "@/components/shared/image.component";
import { useFileUpload } from "@/hooks/index.hook";

interface ImageUploaderProps {
  value: File | null;
  onChange: (file: File | null) => void;
  existingImageUrl?: string;
  onRemove?: () => void;
  className?: string;
}

const ImageUploader = memo(function ImageUploader({
  value,
  onChange,
  existingImageUrl,
  onRemove,
  className,
}: ImageUploaderProps) {
  const { inputRef, objectUrl, handleFileSelect, clear, openFileDialog } = useFileUpload({
    acceptPrefix: "image/",
    value,
    onChange,
    existingUrl: existingImageUrl,
  });

  return (
    <div
      className={cn(
        "relative flex flex-col rounded border-2 border-dashed border-highlight-high bg-card transition-all",
        className,
      )}
      tabIndex={0}
    >
      {objectUrl ? (
        <div className="group relative aspect-video w-full overflow-hidden rounded">
          <Image
            src={objectUrl}
            alt="Preview"
            className="h-full w-full object-contain"
            type="contain"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="error"
              size="icon"
              className="size-10"
              onClick={(e) => {
                e.stopPropagation();
                clear();
                onRemove?.();
              }}
              type="button"
            >
              <X className="size-5" />
            </Button>
          </div>
          <div className="absolute bottom-2 right-2 flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
              type="button"
            >
              <Upload className="size-4" />
              Заменить
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-3 p-4 transition-colors hover:bg-muted/30"
          onClick={openFileDialog}
        >
          <ImagePlus />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
});

export { ImageUploader };
