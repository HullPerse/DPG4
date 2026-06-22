import { describe, it, expect } from "vitest";
import { compareItems, toggleDirection } from "@/lib/sorting.utils";

const items = [
  { label: "Beta", charge: 5, created: "2024-01-01", type: "item" },
  { label: "Alpha", charge: 3, created: "2024-06-15", type: "effect" },
  { label: "Gamma", charge: 10, created: "2023-12-01", type: "item" },
];

describe("compareItems", () => {
  it("sorts by name ascending", () => {
    const sorted = [...items].sort((a, b) => compareItems(a, b, "name", "asc"));
    expect(sorted[0]!.label).toBe("Alpha");
    expect(sorted[2]!.label).toBe("Gamma");
  });

  it("sorts by name descending", () => {
    const sorted = [...items].sort((a, b) => compareItems(a, b, "name", "desc"));
    expect(sorted[0]!.label).toBe("Gamma");
    expect(sorted[2]!.label).toBe("Alpha");
  });

  it("sorts by charge ascending", () => {
    const sorted = [...items].sort((a, b) => compareItems(a, b, "charges", "asc"));
    expect(sorted[0]!.charge).toBe(3);
    expect(sorted[2]!.charge).toBe(10);
  });

  it("sorts by date ascending", () => {
    const sorted = [...items].sort((a, b) => compareItems(a, b, "date", "asc"));
    expect(sorted[0]!.label).toBe("Gamma");
    expect(sorted[2]!.label).toBe("Alpha");
  });

  it("sorts by type ascending", () => {
    const sorted = [...items].sort((a, b) => compareItems(a, b, "type", "asc"));
    expect(sorted[0]!.type).toBe("effect");
    expect(sorted[2]!.type).toBe("item");
  });

  it("handles equal items", () => {
    const same = [
      { label: "A", charge: 1, created: "2024-01-01", type: "item" },
      { label: "A", charge: 1, created: "2024-01-01", type: "item" },
    ];
    expect(compareItems(same[0]!, same[1]!, "name", "asc")).toBe(0);
  });
});

describe("toggleDirection", () => {
  it("toggles asc to desc", () => {
    expect(toggleDirection("asc")).toBe("desc");
  });

  it("toggles desc to asc", () => {
    expect(toggleDirection("desc")).toBe("asc");
  });
});
