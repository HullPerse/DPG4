import { createContext, useContext } from "react";
import type { AdminSchema } from "@/types";

const SchemaContext = createContext<{ schema: AdminSchema } | null>(null);

export function SchemaProvider({
  schema,
  children,
}: {
  schema: AdminSchema;
  children: React.ReactNode;
}) {
  return (
    <SchemaContext.Provider value={{ schema }}>{children}</SchemaContext.Provider>
  );
}

export function useSchema() {
  const ctx = useContext(SchemaContext);
  if (!ctx) throw new Error("useSchema outside SchemaProvider");
  return ctx;
}
