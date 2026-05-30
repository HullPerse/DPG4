export type AdminFieldType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "json"
  | "objectList"
  | "blob"
  | "audio"
  | "password"
  | "hidden";

export type AdminFieldMeta = {
  source: string;
  type: AdminFieldType;
  hideInList?: boolean;
  objectListColumns?: string[];
  reference?: { table: string; labelField: string };
};

export type AdminTableMeta = {
  label: string;
  searchFields: string[];
  fields: AdminFieldMeta[];
};

export type AdminSchema = {
  tables: Record<string, AdminTableMeta>;
};
