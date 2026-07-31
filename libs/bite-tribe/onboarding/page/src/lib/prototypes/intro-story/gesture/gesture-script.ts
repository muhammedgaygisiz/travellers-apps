/**
 * Declarative gesture script types + fluent builders.
 *
 * Every step is data. Synced steps (scrollSynced / drag) share one progress `t`
 * with the pointer — never pair a CSS delay with a separate UI animation.
 *
 *   import { G, script } from './gesture';
 *   const steps = script()
 *     .appear({ x: 50, y: 80 })
 *     .moveTo({ x: 50, y: 40 }, 700)
 *     .scrollSynced({ pointerFrom:…, pointerTo:…, deltaY: 200, duration: 1000 })
 *     .tap({ x: 50, y: 46 })
 *     .then(() => navigate('details'))
 *     .wait(500)
 *     .build();
 */

import type { EasingFn } from './easing';
import { easeInOutCubic, easeOutCubic } from './easing';

/** Native-space position as % of the staged phone (0–100). */
export type PointPct = { x: number; y: number };

/** Resolve either an explicit % point or a CSS selector under the stage root. */
export type PointOrSelector = PointPct | string;

/**
 * Opaque side-effect payload for the host (navigate, follow, etc.).
 * Keep domain actions out of the controller — emit and handle upstream.
 */
export type GestureEmit =
  | { type: 'navigate'; screen: string; biteId?: string }
  | { type: 'openPicker' }
  | { type: 'selectPickerPhoto' }
  | { type: 'selectPickerPhotoIndex'; index: number }
  | { type: 'closePicker' }
  | { type: 'applyPhoto' }
  | { type: 'reactLikes' }
  | { type: 'follow' }
  | { type: 'unfollow' }
  | { type: 'resetFollow' }
  | { type: 'selectPin'; biteId: string }
  | { type: 'clearPin' }
  | { type: 'highlightDirections' }
  | { type: 'clearHighlight' }
  /** Flow variants — stage-owned UI state for Find / Share intentions. */
  | { type: 'openSearch' }
  | { type: 'applySearch'; term: string }
  | { type: 'closeSearch' }
  | { type: 'applyFilter'; tag: string }
  | { type: 'clearFilter' }
  | { type: 'applySort'; sorting: string }
  | { type: 'highlightShareSheet' }
  | { type: 'clearShareSheet' }
  | { type: 'showNewFeedCard' }
  | { type: 'clearNewFeedCard' }
  | { type: 'setDraftTags'; tags: string[] }
  | { type: 'setLocationGps' }
  | { type: 'setDraftName'; name: string }
  /** Flow variants — Join the tribe / Ready to taste intentions. */
  | { type: 'saveBucketlist' }
  | { type: 'clearBucketlist' }
  | { type: 'showTip'; title: string; body: string }
  | { type: 'hideTip' }
  | { type: 'showMenu' }
  | { type: 'hideMenu' }
  | { type: 'showInlineFollow' }
  | { type: 'hideInlineFollow' }
  | { type: 'showUnfollowConfirm' }
  | { type: 'hideUnfollowConfirm' }
  | { type: 'expandDrawer' }
  | { type: 'collapseDrawer' }
  | { type: 'setCreator'; creatorId: 'lina' | 'marco' }
  | { type: 'emphasizeFollowers' }
  | { type: 'clearEmphasizeFollowers' }
  | { type: 'walkingSuccess' }
  | { type: 'clearWalkingSuccess' }
  | { type: 'panMap'; dxPct: number; dyPct: number }
  | { type: 'resetMapPan' }
  /**
   * Soft sparkle burst around a success anchor (CSS selector under the stage).
   * Prefer after the resolve hold — never mid-action.
   */
  | { type: 'celebrate'; anchor?: string }
  /** Clear celebration particles. */
  | { type: 'clearCelebrate' }
  /** Soft single-beat restart: parent fades, resets, then gesture replays. */
  | { type: 'softRestart' };
// NOTE: do not add `{ type: string; [k: string]: unknown }` — it widens
// every property to `unknown` and breaks navigate/screen typing.

export type GestureScriptStep =
  | { kind: 'appear'; at: PointPct }
  | { kind: 'hide' }
  | {
      kind: 'moveTo';
      to: PointOrSelector;
      duration: number;
      easing?: EasingFn;
    }
  | { kind: 'down' }
  | { kind: 'up' }
  | {
      kind: 'tap';
      at: PointOrSelector;
      approachMs?: number;
      /** Fired at the moment of press (after approach). */
      onPress?: () => void;
      /**
       * Domain emit at the moment of press — keeps cursor on the control
       * while the UI state change happens (picker open, follow, like, pin).
       */
      emitOnPress?: GestureEmit;
      /** When true, also dispatch pointer/mouse events at the hit target. */
      dispatchDom?: boolean;
    }
  | {
      kind: 'scrollSynced';
      /** Pointer travel in native % while scrolling (same `t` as scrollTop). */
      pointerFrom: PointPct;
      pointerTo: PointPct;
      /**
       * Fallback scrollTop delta in px. Prefer `scrollTo` so the finger
       * lands on a real card instead of a guessed offset.
       */
      deltaY: number;
      duration: number;
      easing?: EasingFn;
      /**
       * CSS selector under the stage — scroll until this element’s center
       * sits at `alignY` of the scroller viewport (same card you will tap).
       */
      scrollTo?: string;
      /** 0–1 vertical align inside scroller (0.4 ≈ upper-middle under finger). */
      alignY?: number;
      /** Optional override; defaults to controller getScroller(). */
      scroller?: HTMLElement | (() => HTMLElement | null);
    }
  | {
      /**
       * Scroll until `target` sits under the pointer at `alignY`%.
       * Pointer + scrollTop share one `t` — no guessed delays.
       */
      kind: 'scrollToTarget';
      target: PointOrSelector;
      /** Stage Y% where the target center should land (default 48). */
      alignY?: number;
      /** Pointer X% during the drag (default 52). */
      pointerX?: number;
      duration: number;
      easing?: EasingFn;
    }
  | {
      kind: 'drag';
      to: PointPct;
      duration: number;
      /** Optional scrollTop lockstep (same `t`). */
      scrollDeltaY?: number;
      /** Called every frame with shared `t` after easing. */
      onProgress?: (t: number, point: PointPct) => void;
      easing?: EasingFn;
    }
  /** Alias retained for older scripts — identical to `drag`. */
  | {
      kind: 'dragTo';
      to: PointPct;
      duration: number;
      scrollDeltaY?: number;
      onProgress?: (t: number, point: PointPct) => void;
      easing?: EasingFn;
    }
  | { kind: 'wait'; ms: number }
  | { kind: 'then'; fn: () => void | Promise<void> }
  /** Alias of `then` for older scripts. */
  | { kind: 'run'; fn: () => void | Promise<void> }
  | { kind: 'emit'; action: GestureEmit };

/** Compact step factories for data-driven beat scripts. */
export const G = {
  appear: (at: PointPct): GestureScriptStep => ({ kind: 'appear', at }),
  hide: (): GestureScriptStep => ({ kind: 'hide' }),
  moveTo: (
    to: PointOrSelector,
    duration: number,
    easing: EasingFn = easeOutCubic,
  ): GestureScriptStep => ({ kind: 'moveTo', to, duration, easing }),
  down: (): GestureScriptStep => ({ kind: 'down' }),
  up: (): GestureScriptStep => ({ kind: 'up' }),
  tap: (
    at: PointOrSelector,
    opts?: Omit<Extract<GestureScriptStep, { kind: 'tap' }>, 'kind' | 'at'>,
  ): GestureScriptStep => ({ kind: 'tap', at, ...opts }),
  drag: (
    to: PointPct,
    duration: number,
    opts?: Omit<
      Extract<GestureScriptStep, { kind: 'drag' }>,
      'kind' | 'to' | 'duration'
    >,
  ): GestureScriptStep => ({
    kind: 'drag',
    to,
    duration,
    ...opts,
    easing: opts?.easing ?? easeInOutCubic,
  }),
  scrollSynced: (
    opts: Omit<Extract<GestureScriptStep, { kind: 'scrollSynced' }>, 'kind'>,
  ): GestureScriptStep => ({
    kind: 'scrollSynced',
    ...opts,
    easing: opts.easing ?? easeInOutCubic,
  }),
  scrollToTarget: (
    target: PointOrSelector,
    duration: number,
    opts?: Omit<
      Extract<GestureScriptStep, { kind: 'scrollToTarget' }>,
      'kind' | 'target' | 'duration'
    >,
  ): GestureScriptStep => ({
    kind: 'scrollToTarget',
    target,
    duration,
    alignY: opts?.alignY ?? 48,
    pointerX: opts?.pointerX ?? 52,
    easing: opts?.easing ?? easeInOutCubic,
  }),
  wait: (ms: number): GestureScriptStep => ({ kind: 'wait', ms }),
  then: (fn: () => void | Promise<void>): GestureScriptStep => ({
    kind: 'then',
    fn,
  }),
  emit: (action: GestureEmit): GestureScriptStep => ({ kind: 'emit', action }),
} as const;

/** Fluent script builder — `.then(fn)` is both chain continuation and a step. */
export class GestureScriptBuilder {
  private readonly steps: GestureScriptStep[] = [];

  appear(at: PointPct): this {
    this.steps.push(G.appear(at));
    return this;
  }

  hide(): this {
    this.steps.push(G.hide());
    return this;
  }

  moveTo(
    to: PointOrSelector,
    duration: number,
    easing: EasingFn = easeOutCubic,
  ): this {
    this.steps.push(G.moveTo(to, duration, easing));
    return this;
  }

  down(): this {
    this.steps.push(G.down());
    return this;
  }

  up(): this {
    this.steps.push(G.up());
    return this;
  }

  tap(
    at: PointOrSelector,
    opts?: Omit<Extract<GestureScriptStep, { kind: 'tap' }>, 'kind' | 'at'>,
  ): this {
    this.steps.push(G.tap(at, opts));
    return this;
  }

  drag(
    to: PointPct,
    duration: number,
    opts?: Omit<
      Extract<GestureScriptStep, { kind: 'drag' }>,
      'kind' | 'to' | 'duration'
    >,
  ): this {
    this.steps.push(G.drag(to, duration, opts));
    return this;
  }

  scrollSynced(
    opts: Omit<Extract<GestureScriptStep, { kind: 'scrollSynced' }>, 'kind'>,
  ): this {
    this.steps.push(G.scrollSynced(opts));
    return this;
  }

  scrollToTarget(
    target: PointOrSelector,
    duration: number,
    opts?: Omit<
      Extract<GestureScriptStep, { kind: 'scrollToTarget' }>,
      'kind' | 'target' | 'duration'
    >,
  ): this {
    this.steps.push(G.scrollToTarget(target, duration, opts));
    return this;
  }

  wait(ms: number): this {
    this.steps.push(G.wait(ms));
    return this;
  }

  then(fn: () => void | Promise<void>): this {
    this.steps.push(G.then(fn));
    return this;
  }

  emit(action: GestureEmit): this {
    this.steps.push(G.emit(action));
    return this;
  }

  /** Append raw steps (compose partial scripts). */
  push(...steps: GestureScriptStep[]): this {
    this.steps.push(...steps);
    return this;
  }

  build(): GestureScriptStep[] {
    return [...this.steps];
  }
}

export function script(): GestureScriptBuilder {
  return new GestureScriptBuilder();
}
