export type SortMethod = "name" | "date" | "charges" | "type";
export type SortDirection = "asc" | "desc";

export const sortMethodLabels: Record<SortMethod, string> = {
  name: "По имени",
  date: "По дате",
  charges: "По зарядам",
  type: "По типу",
};

export function compareItems<
  T extends { label: string; charge: number; created: string; type: string },
>(a: T, b: T, method: SortMethod, direction: SortDirection): number {
  const methodMap = {
    name: a.label.localeCompare(b.label),
    charges: a.charge - b.charge,
    date: new Date(a.created).getTime() - new Date(b.created).getTime(),
    type: a.type.localeCompare(b.type),
  };

  const result = methodMap[method] ?? new Date(a.created).getTime() - new Date(b.created).getTime();

  if (direction === "asc") return result;
  else return -result;
}

export function toggleDirection(d: SortDirection): SortDirection {
  return d === "asc" ? "desc" : "asc";
}
