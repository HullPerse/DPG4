import { memo, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: number;
  type?: "cover" | "contain";
  placeholder?: string;
}

const Image = ({
  src,
  alt,
  className,
  width,
  height,
  type = "cover",
  quality = 80,
  placeholder = "https://placehold.co/400x600",
  ...props
}: ImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);
  const [usedFallback, setUsedFallback] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);

  const getWebpSrc = (originalSrc: string) => {
    const isExternal =
      originalSrc.startsWith("http") ||
      originalSrc.startsWith("https") ||
      originalSrc.startsWith("ftp") ||
      originalSrc.startsWith("data:") ||
      originalSrc.startsWith("blob:");

    if (!originalSrc || isExternal) return originalSrc;

    const baseSrc = originalSrc.split("?")[0];
    return `${baseSrc}?format=webp&quality=${quality}`;
  };

  useEffect(() => {
    setImageSrc(src);
    setUsedFallback(false);
    setIsLoaded(false);
  }, [src]);

  useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, [imageSrc]);

  const handleError = () => {
    if (!usedFallback) {
      setUsedFallback(true);
      setImageSrc(placeholder);
      setIsLoaded(false);
      return;
    }
    setImageSrc("");
  };

  return (
    <div
      className={cn(
        "relative flex w-full items-center overflow-hidden",
        className,
      )}
      style={{
        aspectRatio: width && height ? `${width}/${height}` : undefined,
      }}
    >
      {imageSrc ? (
        <picture>
          <source srcSet={getWebpSrc(imageSrc)} type="image/webp" />
          <img
            ref={imgRef}
            src={imageSrc}
            alt={alt}
            width={width}
            height={height}
            className={cn(
              "absolute inset-0 h-full w-full transition-opacity duration-300",
              type === "cover" ? "object-cover" : "object-contain",
              isLoaded ? "opacity-100" : "opacity-0",
            )}
            loading="lazy"
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={handleError}
            {...props}
          />
        </picture>
      ) : (
        <div className="flex h-full w-full items-center justify-center border border-primary/20 bg-background/40">
          <span className="text-muted-foreground text-xs">Изображение</span>
        </div>
      )}
    </div>
  );
};

export default memo(Image);
