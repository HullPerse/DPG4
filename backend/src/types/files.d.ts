export type FileField = "image" | "audio";

export type FilePayload = {
  data: Buffer;
  mime: string;
};
