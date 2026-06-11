import { WHEEL_SEGMENTS, WHEEL_COLORS } from "./gamble.constants";

export const WHEEL_SEGMENT_COUNT = WHEEL_SEGMENTS.length;
export const WHEEL_SEGMENT_ANGLE = (2 * Math.PI) / WHEEL_SEGMENT_COUNT;

export function getSegmentAngle(index: number): { start: number; end: number } {
  return {
    start: index * WHEEL_SEGMENT_ANGLE - Math.PI / 2,
    end: (index + 1) * WHEEL_SEGMENT_ANGLE - Math.PI / 2,
  };
}

export function getSegmentColor(index: number): string {
  return WHEEL_COLORS[index % WHEEL_COLORS.length];
}

export function getSegmentMultiplier(index: number): number {
  return WHEEL_SEGMENTS[index % WHEEL_SEGMENTS.length].mult;
}

export function formatMultiplier(mult: number): string {
  return `${mult}x`;
}

export function wheelSpinDuration(): number {
  return 3000 + Math.random() * 2000;
}

export function computeSpinEndAngle(
  targetSegment: number,
  fullRotations: number,
): number {
  const segmentCenter =
    targetSegment * WHEEL_SEGMENT_ANGLE + WHEEL_SEGMENT_ANGLE / 2;
  return fullRotations * 2 * Math.PI + (Math.PI / 2 - segmentCenter);
}
