import sharp from "sharp";

export async function compressSquare(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(215, 215, { fit: "cover", position: "center" })
    .webp({ quality: 80 })
    .toBuffer();
}

export async function compressWebp(buffer: Buffer, quality = 90): Promise<Buffer> {
  return sharp(buffer).webp({ quality }).toBuffer();
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}
