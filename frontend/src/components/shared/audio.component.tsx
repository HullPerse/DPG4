import { useCallback, useEffect, useRef, useState } from "react";
import { Music, X, Play, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button.component";

interface AudioUploaderProps {
  value: File | null;
  onChange: (file: File | null) => void;
  existingAudioUrl?: string;
  onRemove?: () => void;
  className?: string;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  compressedSize?: number;
}

export function AudioUploader({
  value,
  onChange,
  existingAudioUrl,
  onRemove,
  className,
  volume = 1,
  onVolumeChange,
}: AudioUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (value) {
      const url = URL.createObjectURL(value);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (existingAudioUrl) {
      setAudioUrl(existingAudioUrl);
    } else {
      setAudioUrl(null);
    }
  }, [value, existingAudioUrl]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = parseFloat(e.target.value);
      onVolumeChange?.(newVolume);
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
      }
    },
    [onVolumeChange],
  );

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, audioUrl]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("audio/")) {
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

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
      setAudioUrl(null);
      setIsPlaying(false);
      onRemove?.();
    },
    [onChange, onRemove],
  );

  return (
    <div
      className={cn(
        "relative flex flex-col rounded border-2 border-dashed border-highlight-high bg-card transition-all p-4",
        className,
      )}
      tabIndex={0}
    >
      {audioUrl ? (
        <div className="group flex flex-col gap-2">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="icon"
              onClick={togglePlayback}
              type="button"
            >
              {isPlaying ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
            </Button>
            <span className="text-sm truncate flex-1">
              {value?.name || "Audio"}
            </span>
            <Button
              variant="error"
              size="icon"
              onClick={handleRemove}
              type="button"
            >
              <X className="size-4" />
            </Button>
          </div>
          {value && (
            <div className="text-xs text-muted space-y-1">
              <div>Размер: {formatSize(value.size)}</div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Volume2 className="size-4" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1"
            />
            <span className="text-xs w-10 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex aspect-video w-full h-20 cursor-pointer flex-col items-center justify-center gap-3 p-4 transition-colors hover:bg-muted/30"
          onClick={() => inputRef.current?.click()}
        >
          <Music className="size-10" />
          <span className="text-sm text-muted">Загрузить аудио</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
