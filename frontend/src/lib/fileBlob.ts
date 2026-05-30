export async function fileToBase64(
  file: File,
): Promise<{ base64: string; mime: string }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return {
    base64: btoa(binary),
    mime: file.type || "application/octet-stream",
  };
}

export async function filePayload(file: File | null | undefined) {
  if (!file) return null;
  return fileToBase64(file);
}
