import PocketBase from "pocketbase";

//Both of these are locals so yeah
export const URL = "http://26.15.36.191:8090/";
//export const URL = "http://127.0.0.1:8090/";

export const client = new PocketBase(URL);

client.autoCancellation(false);

export const checkConnection = async () => {
  try {
    await client.health.check();
    return true;
  } catch {
    return false;
  }
};

export const getFileUrl = <T extends { collectionId?: string; id?: string }>(
  record: T | null | undefined,
  field: string = "image",
): string | null => {
  const r = record as Record<string, unknown>;
  if (!r?.collectionId || !r?.id || !r?.[field]) return null;

  return `${URL}api/files/${r.collectionId}/${r.id}/${r[field]}`;
};
