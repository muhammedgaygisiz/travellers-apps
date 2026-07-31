/**
 * Phone stage scale — fit a full native phone (default 390×844) into a frame.
 *
 * Renders the UI at native size, then applies `transform: scale(...)` so the
 * whole phone (including top filters / chrome) stays visible. Prefer zoom=1;
 * only raise zoom for intentional close-ups (edges will clip equally or via focus).
 *
 *   const { transform, scale } = fitPhoneStage({
 *     frameW, frameH,
 *     nativeW: 390, nativeH: 844,
 *     padding: 8, zoom: 1,
 *   });
 *   // style: width/height = native; transform-origin: top left; transform
 */

import { INTRO_UI_NATIVE } from '../intro-story.model';

export interface PhoneStageSize {
  width: number;
  height: number;
}

export interface FitPhoneStageInput {
  /** Visible stage / viewport width in CSS px. */
  frameW: number;
  /** Visible stage / viewport height in CSS px. */
  frameH: number;
  /** Native phone width (default INTRO_UI_NATIVE.width = 390). */
  nativeW?: number;
  /** Native phone height (default INTRO_UI_NATIVE.height = 844). */
  nativeH?: number;
  /** Inset so the phone doesn't kiss the frame edge (default 8). */
  padding?: number;
  /**
   * Multiplier on fit-scale. 1 = entire phone visible (filters not clipped).
   * Values > 1 zoom in; keep ≤ ~1.08 unless intentionally cropping.
   */
  zoom?: number;
  /** Focus X as % of native width when zoom > 1 (default 50). */
  focusX?: number;
  /** Focus Y as % of native height when zoom > 1 (default 50). */
  focusY?: number;
}

export interface FitPhoneStageResult {
  /** CSS transform string: translate + scale, origin top-left. */
  transform: string;
  /** Effective scale applied to the native surface. */
  scale: number;
  /** Fit scale before zoom. */
  fit: number;
  nativeW: number;
  nativeH: number;
}

/**
 * Compute a translate+scale that fits the native phone into the frame.
 * Always centers at zoom=1; when zoom>1, keeps `focusX/Y` near the viewport center.
 */
export function fitPhoneStage(input: FitPhoneStageInput): FitPhoneStageResult {
  const nativeW = input.nativeW ?? INTRO_UI_NATIVE.width;
  const nativeH = input.nativeH ?? INTRO_UI_NATIVE.height;
  const padding = input.padding ?? 8;
  const zoom = Math.max(1, input.zoom ?? 1);
  const focusX = clamp(input.focusX ?? 50, 0, 100) / 100;
  const focusY = clamp(input.focusY ?? 50, 0, 100) / 100;

  const availW = Math.max(1, input.frameW - padding * 2);
  const availH = Math.max(1, input.frameH - padding * 2);
  const fit = Math.min(availW / nativeW, availH / nativeH);
  const scale = fit * zoom;

  // Unscaled phone top-left that centers the (possibly zoomed) surface.
  let tx = (input.frameW - nativeW * scale) / 2;
  let ty = (input.frameH - nativeH * scale) / 2;

  if (zoom > 1) {
    // Shift so the focus point sits near the frame center.
    const focusPxX = nativeW * focusX * scale;
    const focusPxY = nativeH * focusY * scale;
    tx = input.frameW / 2 - focusPxX;
    ty = input.frameH / 2 - focusPxY;
  }

  return {
    transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${scale.toFixed(5)})`,
    scale,
    fit,
    nativeW,
    nativeH,
  };
}

/** Convenience: just the CSS transform string. */
export function fitPhoneStageTransform(input: FitPhoneStageInput): string {
  return fitPhoneStage(input).transform;
}

export const PHONE_STAGE_NATIVE: PhoneStageSize = {
  width: INTRO_UI_NATIVE.width,
  height: INTRO_UI_NATIVE.height,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
