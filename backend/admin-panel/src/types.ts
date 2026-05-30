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
  | "hidden"
  | "select";

export type AdminChoice = { value: string; label?: string };

export type AdminColumnMeta = {
  kind?: "text" | "number" | "boolean" | "select";
  choices?: AdminChoice[];
};

export type AdminFieldMeta = {
  source: string;
  type: AdminFieldType;
  hideInList?: boolean;
  objectListColumns?: string[];
  columns?: Record<string, AdminColumnMeta>;
  choices?: AdminChoice[];
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
