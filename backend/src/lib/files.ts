export type FilePayload = {
  data: Buffer;
  mime: string;
};

export function bufferFromBase64(base64: string): Buffer {
  const raw = base64.includes(",") ? base64.split(",")[1]! : base64;
  return Buffer.from(raw, "base64");
}

export function parseFileInput(
  input: unknown,
): FilePayload | null | undefined {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (input instanceof Buffer) return { data: input, mime: "application/octet-stream" };
  if (typeof input === "object" && input !== null && "base64" in input) {
    const obj = input as { base64: string; mime?: string };
    return {
      data: bufferFromBase64(obj.base64),
      mime: obj.mime || "application/octet-stream",
    };
  }
  return undefined;
}

export function hasFileField(value: FilePayload | null | undefined): boolean {
  return value !== undefined;
}
