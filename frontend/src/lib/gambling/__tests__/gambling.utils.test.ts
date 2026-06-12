import { describe, it, expect } from "vitest";
import { getResultColor, GameResultData } from "@/lib/gambling/gambling.utils";

describe("getResultColor", () => {
  it("returns empty string for null result", () => {
    expect(getResultColor(null)).toBe("");
  });

  it("returns amber for jackpot", () => {
    const result: GameResultData = { net: 100, label: "Jackpot", tone: "jackpot" };
    expect(getResultColor(result)).toBe("text-amber-400");
  });

  it("returns emerald for positive net with non-jackpot tone", () => {
    const result: GameResultData = { net: 50, label: "Win", tone: "win" };
    expect(getResultColor(result)).toBe("text-emerald-400");
  });

  it("returns red for negative net", () => {
    const result: GameResultData = { net: -20, label: "Lose", tone: "lose" };
    expect(getResultColor(result)).toBe("text-red-400");
  });

  it("returns muted for zero net", () => {
    const result: GameResultData = { net: 0, label: "Push", tone: "chance" };
    expect(getResultColor(result)).toBe("text-muted");
  });

  it("handles exact zero net with negative-like tone", () => {
    const result: GameResultData = { net: 0, label: "Draw", tone: "lose" };
    expect(getResultColor(result)).toBe("text-muted");
  });
});
