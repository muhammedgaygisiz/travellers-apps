/**
 * Shared easing for SyncedGestureController timelines.
 * Prefer these over CSS transition delays when pointer + UI must share `t`.
 */

export type EasingFn = (t: number) => number;

export const easeLinear: EasingFn = (t) => t;

export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3);

export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Approximation of cubic-bezier(0.22, 1, 0.36, 1) — sweet layout feel. */
export const easeOutExpoish: EasingFn = (t) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t) * 0.5 + t * 0.5;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
