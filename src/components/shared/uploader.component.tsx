import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button.component";
import Image from "@/components/shared/image.component";

interface ImageUploaderProps {
  value: File | null;
  onChange: (file: File | null) => void;
  existingImageUrl?: string;
  onRemove?: () => void;
  className?: string;
}

export function ImageUploader({
  value,
  onChange,
  existingImageUrl,
  onRemove,
  className,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(
    value
      ? URL.createObjectURL(value)
      : existingImageUrl
        ? existingImageUrl
        : null,
  );

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        console.error("Invalid file type");
        return;
      }
      onChange(file);
    },
    [onChange],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile],
  );

  useEffect(() => {
    if (value) {
      setImage(URL.createObjectURL(value));
    } else if (existingImageUrl) {
      setImage(existingImageUrl);
    } else {
      setImage(null);
    }
  }, [value, existingImageUrl]);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded border-2 border-dashed border-highlight-high bg-card transition-all",
        className,
      )}
      tabIndex={0}
    >
      {image ? (
        <div className="group relative aspect-video w-full overflow-hidden rounded">
          <Image
            src={image}
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
                onChange(null);
                setImage(null);
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
                inputRef.current?.click();
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
          onClick={() => inputRef.current?.click()}
        ></button>
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
}
