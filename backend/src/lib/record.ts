import { COLLECTION_IDS } from "../config";

export type DbTimestamps = {
  created: string;
  updated: string;
};

export function withRecordMeta<T extends DbTimestamps>(
  row: T,
  collectionName: keyof typeof COLLECTION_IDS,
): T & {
  collectionId: string;
  collectionName: string;
} {
  return {
    ...row,
    collectionId: COLLECTION_IDS[collectionName] ?? collectionName,
    collectionName,
  };
}

export function omitPassword<T extends { passwordHash?: string }>(row: T): Omit<T, "passwordHash"> {
  const { passwordHash: _, ...rest } = row;
  return rest;
}
