import { describe, it, expect } from "vitest";
import {
  computeMultiplier,
  multiplierColor,
  elapsedFromMultiplier,
  isActivePhase,
  formatRocketResultLabel,
  potentialPayout,
  potentialNet,
} from "@/lib/gambling/rocket.utils";

describe("computeMultiplier", () => {
  it("returns 0.5 at t=0", () => {
    expect(computeMultiplier(0)).toBe(0.5);
  });

  it("returns ~1.0 around 3.4s", () => {
    const m = computeMultiplier(3400);
    expect(m).toBeGreaterThanOrEqual(0.95);
    expect(m).toBeLessThanOrEqual(1.1);
  });

  it("increases over time", () => {
    const m1 = computeMultiplier(1000);
    const m5 = computeMultiplier(5000);
    expect(m5).toBeGreaterThan(m1);
  });

  it("always returns non-negative value", () => {
    expect(computeMultiplier(-1000)).toBeGreaterThanOrEqual(0);
    expect(computeMultiplier(0)).toBeGreaterThanOrEqual(0);
    expect(computeMultiplier(999999)).toBeGreaterThanOrEqual(0);
  });

  it("is monotonic", () => {
    for (let ms = 0; ms < 10000; ms += 500) {
      const m1 = computeMultiplier(ms);
      const m2 = computeMultiplier(ms + 100);
      expect(m2).toBeGreaterThanOrEqual(m1);
    }
  });
});

describe("multiplierColor", () => {
  it("returns blue for mult < 2", () => {
    expect(multiplierColor(1.5)).toBe("#3e8fb0");
  });

  it("returns amber for 2 <= mult < 5", () => {
    expect(multiplierColor(3)).toBe("#f6c177");
  });

  it("returns pink for 5 <= mult < 10", () => {
    expect(multiplierColor(7)).toBe("#eb6f92");
  });

  it("returns purple for mult >= 10", () => {
    expect(multiplierColor(15)).toBe("#c4a7e7");
  });
});

describe("elapsedFromMultiplier", () => {
  it("returns ~0 for multiplier <= 1", () => {
    const e = elapsedFromMultiplier(1);
    expect(e).toBeLessThan(4000);
  });

  it("returns larger time for larger multiplier", () => {
    const e2 = elapsedFromMultiplier(2);
    const e5 = elapsedFromMultiplier(5);
    expect(e5).toBeGreaterThan(e2);
  });

  it("is bijective-ish with computeMultiplier", () => {
    const mult = 3;
    const elapsed = elapsedFromMultiplier(mult);
    const computed = computeMultiplier(elapsed);
    expect(computed).toBeGreaterThanOrEqual(mult - 0.05);
  });
});

describe("isActivePhase", () => {
  it("returns true for launching", () => {
    expect(isActivePhase("launching")).toBe(true);
  });

  it("returns true for flying", () => {
    expect(isActivePhase("flying")).toBe(true);
  });

  it("returns false for idle", () => {
    expect(isActivePhase("idle")).toBe(false);
  });

  it("returns false for crashed", () => {
    expect(isActivePhase("crashed")).toBe(false);
  });
});

describe("formatRocketResultLabel", () => {
  it("returns the label as-is for positive net", () => {
    expect(formatRocketResultLabel("You won!", 50)).toBe("You won!");
  });

  it("returns the label as-is for negative net", () => {
    expect(formatRocketResultLabel("You lost!", -10)).toBe("You lost!");
  });
});

describe("potentialPayout / potentialNet", () => {
  it("calculates payout correctly", () => {
    expect(potentialPayout(100, 2.5)).toBe(250);
  });

  it("calculates net correctly", () => {
    expect(potentialNet(100, 2.5)).toBe(150);
  });
});
