import { describe, it, expect } from "vitest";
import {
  getSlotWidths,
  slotColor,
  PACHINKO_SLOT_COUNT,
  PACHINKO_SLOT_MULTIPLIERS,
  BOARD_WIDTH,
  slotCenterX,
  slotIndexFromX,
  randomDropOffsetX,
} from "@/lib/gambling/pachinko.utils";

describe("constants", () => {
  it("has 13 slots", () => {
    expect(PACHINKO_SLOT_COUNT).toBe(13);
  });

  it("multipliers are symmetric", () => {
    const arr = [...PACHINKO_SLOT_MULTIPLIERS];
    for (let i = 0; i < arr.length; i++) {
      expect(arr[i]).toBe(arr[arr.length - 1 - i]);
    }
  });

  it("BOARD_WIDTH is 17", () => {
    expect(BOARD_WIDTH).toBe(17);
  });
});

describe("getSlotWidths", () => {
  it("returns 13 widths that sum to BOARD_WIDTH", () => {
    const widths = getSlotWidths(1);
    expect(widths).toHaveLength(13);
    const sum = widths.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(BOARD_WIDTH, 5);
  });

  it("returns all positive widths for any bid", () => {
    for (const bid of [1, 10, 100, 1000]) {
      const widths = getSlotWidths(bid);
      for (const w of widths) {
        expect(w).toBeGreaterThan(0);
      }
    }
  });

  it("changes distribution with higher bid", () => {
    const w1 = getSlotWidths(1);
    const w100 = getSlotWidths(100);

    // higher bid should make low-multiplier slots wider, high-multiplier narrower
    // slot 0 = 5x (high), last slot = 5x (high)
    // slot 5 = 0.5x (low), slot 6 = 0.5x (low)
    // 5x slots should get narrower with higher bid
    expect(w100[0]).toBeLessThan(w1[0]);
    expect(w100[12]).toBeLessThan(w1[12]);
    // 0.5x slots should get wider with higher bid
    expect(w100[5]).toBeGreaterThan(w1[5]);
    expect(w100[6]).toBeGreaterThan(w1[6]);
  });
});

describe("slotColor", () => {
  it("returns purple for mult >= 5", () => {
    expect(slotColor(5)).toBe("#c4a7e7");
    expect(slotColor(10)).toBe("#c4a7e7");
  });

  it("returns amber for 2 <= mult < 5", () => {
    expect(slotColor(2)).toBe("#f6c177");
    expect(slotColor(3)).toBe("#f6c177");
  });

  it("returns teal for 1 <= mult < 2", () => {
    expect(slotColor(1)).toBe("#9ccfd8");
    expect(slotColor(1.5)).toBe("#9ccfd8");
  });

  it("returns pink for mult < 1", () => {
    expect(slotColor(0.5)).toBe("#eb6f92");
    expect(slotColor(0)).toBe("#eb6f92");
  });
});

describe("slotCenterX", () => {
  it("returns a finite number", () => {
    const x = slotCenterX(0, 1);
    expect(Number.isFinite(x)).toBe(true);
  });
});

describe("slotIndexFromX", () => {
  it("returns the middle slot for NaN", () => {
    expect(slotIndexFromX(NaN, 1)).toBe(Math.floor(13 / 2));
  });

  it("returns slot 0 for far left", () => {
    expect(slotIndexFromX(-100, 1)).toBe(0);
  });

  it("returns last slot for far right", () => {
    expect(slotIndexFromX(100, 1)).toBe(12);
  });
});

describe("randomDropOffsetX", () => {
  it("returns value between -0.375 and 0.375", () => {
    for (let i = 0; i < 50; i++) {
      const v = randomDropOffsetX();
      expect(v).toBeGreaterThanOrEqual(-0.375);
      expect(v).toBeLessThanOrEqual(0.375);
    }
  });
});
