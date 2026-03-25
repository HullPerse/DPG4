import { useCallback, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button.component";
import { Image as ImageComponent } from "@/components/shared/image.component";

interface ImageUploaderProps {
  value: File | null;
  onChange: (file: File | null) => void;
  existingImageUrl?: string;
  showExisting?: boolean;
  onRemoveExisting?: () => void;
  className?: string;
}

export function ImageUploader({
  value,
  onChange,
  existingImageUrl,
  showExisting = true,
  onRemoveExisting,
  className,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            processFile(file);
          }
          break;
        }
      }
    },
    [processFile],
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

  const previewUrl = value
    ? URL.createObjectURL(value)
    : showExisting && existingImageUrl
      ? existingImageUrl
      : undefined;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded border-2 border-dashed border-highlight-high bg-card transition-all",
        isDragging && "border-primary bg-primary/10",
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
    >
      {previewUrl ? (
        <div className="group relative aspect-video w-full overflow-hidden rounded">
          <ImageComponent
            src={previewUrl}
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
                onRemoveExisting?.();
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
