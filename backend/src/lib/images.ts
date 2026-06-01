export async function compressSquare(buffer: Buffer): Promise<Buffer> {
  return Buffer.from(
    await new Bun.Image(buffer)
      .resize(215, 215, { fit: "inside" })
      .webp({ quality: 80 })
      .toBuffer(),
  );
}

export async function compressWebp(buffer: Buffer, quality = 90): Promise<Buffer> {
  return Buffer.from(await new Bun.Image(buffer).webp({ quality }).toBuffer());
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}
