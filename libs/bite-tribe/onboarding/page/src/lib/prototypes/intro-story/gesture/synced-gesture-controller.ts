/**
 * SyncedGestureController (aka IntroGesturePlayer) — reusable intro-story
 * gesture simulation with ONE rAF timeline.
 *
 * Design rules:
 * - A single requestAnimationFrame clock owns pointer position AND UI side-effects.
 * - Synced gestures (scrollSynced, drag) derive pointer + scrollTop from the same
 *   normalized progress `t ∈ [0,1]` — never separate CSS animations with guessed delays.
 * - Soft-dot pointer state is { x, y, visible, pressed } — no cartoon hand.
 *
 * Actions: appear | hide | moveTo | down | up | tap | scrollSynced | drag | wait | then | emit
 *
 * Usage:
 *   const player = new SyncedGestureController({
 *     getPointerEl, getScroller, getStageRoot, onPointer, onEmit,
 *   });
 *   await player.play(script().moveTo({x:50,y:40}, 600).scrollSynced({…}).build());
 *   player.cancel();
 *
 * Alias: IntroGesturePlayer === SyncedGestureController
 */

import { easeInOutCubic, easeOutCubic, lerp, type EasingFn } from './easing';
import type {
  GestureEmit,
  GestureScriptStep,
  PointOrSelector,
  PointPct,
} from './gesture-script';

export interface PointerState {
  x: number;
  y: number;
  visible: boolean;
  pressed: boolean;
}

export interface SyncedGestureControllerOptions {
  /** Soft-dot pointer element (positioned with left/top %). */
  getPointerEl?: () => HTMLElement | null;
  /** Scrollable under the stage (ion-content .inner-scroll). */
  getScroller?: () => HTMLElement | null;
  /** Stage root used to resolve CSS selectors → % points. */
  getStageRoot?: () => HTMLElement | null;
  /** Reflect pointer state into Angular signals / DOM. */
  onPointer?: (state: PointerState) => void;
  /** Optional soft ripple at press coords (%). */
  onRipple?: (x: number, y: number) => void;
  /** Domain side-effects (navigate, follow, …). */
  onEmit?: (action: GestureEmit) => void;
  /** Scroll thumb indicator — fires while scrollSynced / scrollToTarget run. */
  onScrollProgress?: (state: {
    active: boolean;
    t: number;
    scrollTop: number;
    maxScroll: number;
  }) => void;
  /**
   * When true (default), tap/down may dispatch PointerEvent + MouseEvent on the
   * element under the pointer so real Angular handlers can react.
   */
  dispatchDomEvents?: boolean;
}

export class SyncedGestureController {
  private cancelled = false;
  private raf = 0;
  private timers: number[] = [];
  private x = 50;
  private y = 70;
  private visible = false;
  private pressed = false;

  constructor(private readonly opts: SyncedGestureControllerOptions) {}

  /** Snapshot of the soft-dot. */
  get pointer(): PointerState {
    return {
      x: this.x,
      y: this.y,
      visible: this.visible,
      pressed: this.pressed,
    };
  }

  cancel(): void {
    this.cancelled = true;
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    for (const t of this.timers) {
      window.clearTimeout(t);
    }
    this.timers = [];
    this.visible = false;
    this.pressed = false;
    this.pushPointer();
  }

  async play(
    steps: GestureScriptStep[],
    opts?: { loop?: boolean },
  ): Promise<void> {
    do {
      this.cancelled = false;
      for (const step of steps) {
        if (this.cancelled) {
          return;
        }
        await this.runStep(step);
      }
    } while (opts?.loop && !this.cancelled);
  }

  // ---- steps ---------------------------------------------------------------

  private async runStep(step: GestureScriptStep): Promise<void> {
    switch (step.kind) {
      case 'appear':
        this.x = step.at.x;
        this.y = step.at.y;
        this.visible = true;
        this.pressed = false;
        this.pushPointer();
        await this.delay(200);
        return;

      case 'hide':
        this.visible = false;
        this.pressed = false;
        this.pushPointer();
        await this.delay(180);
        return;

      case 'moveTo': {
        const to = this.resolvePoint(step.to);
        if (!to) {
          return;
        }
        await this.tweenPointer(
          to.x,
          to.y,
          step.duration,
          step.easing ?? easeOutCubic,
        );
        return;
      }

      case 'down':
        this.pressed = true;
        this.opts.onRipple?.(this.x, this.y);
        this.pushPointer();
        this.maybeDispatch('pointerdown');
        await this.delay(120);
        return;

      case 'up':
        this.pressed = false;
        this.pushPointer();
        this.maybeDispatch('pointerup');
        await this.delay(80);
        return;

      case 'tap': {
        const at =
          typeof step.at === 'string'
            ? await this.resolvePointWithRetry(step.at)
            : this.resolvePoint(step.at);
        if (!at) {
          // Keep timeline moving even if the target is missing this frame.
          await this.delay(step.approachMs ?? 200);
          return;
        }
        if (step.approachMs && step.approachMs > 0) {
          await this.tweenPointer(at.x, at.y, step.approachMs, easeOutCubic);
        } else {
          this.x = at.x;
          this.y = at.y;
          this.visible = true;
          this.pushPointer();
        }
        this.pressed = true;
        this.opts.onRipple?.(this.x, this.y);
        this.pushPointer();
        if (step.dispatchDom ?? this.opts.dispatchDomEvents) {
          this.maybeDispatch('pointerdown');
        }
        // Fire UI side-effect at press so the cursor is still on the control.
        if (step.emitOnPress) {
          this.opts.onEmit?.(step.emitOnPress);
        }
        step.onPress?.();
        // Hold pressed long enough that the UI state change is readable.
        await this.delay(220);
        this.pressed = false;
        this.pushPointer();
        if (step.dispatchDom ?? this.opts.dispatchDomEvents) {
          this.maybeDispatch('pointerup');
          this.maybeDispatch('click');
        }
        // Follow-through beat — UI settles before the finger leaves.
        await this.delay(200);
        return;
      }

      case 'scrollSynced':
        await this.scrollSynced(step);
        return;

      case 'scrollToTarget':
        await this.scrollToTarget(step);
        return;

      case 'drag':
      case 'dragTo':
        await this.drag(step);
        return;

      case 'wait':
        await this.delay(step.ms);
        return;

      case 'then':
      case 'run':
        await step.fn();
        return;

      case 'emit':
        this.opts.onEmit?.(step.action);
        await this.delay(40);
        return;
    }
  }

  /**
   * Core sync primitive: pointer position + scrollTop share identical `t`.
   * Finger moves from pointerFrom→pointerTo while scrollTop lerps by deltaY.
   */
  private async scrollSynced(
    step: Extract<GestureScriptStep, { kind: 'scrollSynced' }>,
  ): Promise<void> {
    let scroller = this.resolveScroller(step.scroller);
    if (!scroller) {
      for (let i = 0; i < 12 && !this.cancelled; i++) {
        await this.delay(50);
        scroller = this.resolveScroller(step.scroller);
        if (scroller) {
          break;
        }
      }
    }

    const startScroll = scroller?.scrollTop ?? 0;
    const maxScroll = Math.max(
      0,
      (scroller?.scrollHeight ?? 0) - (scroller?.clientHeight ?? 0),
    );
    const endScroll = Math.max(
      0,
      Math.min(maxScroll, startScroll + step.deltaY),
    );
    const ease = step.easing ?? easeInOutCubic;

    this.x = step.pointerFrom.x;
    this.y = step.pointerFrom.y;
    this.visible = true;
    this.pressed = true;
    this.opts.onRipple?.(this.x, this.y);
    this.pushPointer();
    this.opts.onScrollProgress?.({
      active: true,
      t: 0,
      scrollTop: startScroll,
      maxScroll,
    });
    await this.delay(90);

    await this.animate(step.duration, (rawT) => {
      const t = ease(rawT);
      this.x = lerp(step.pointerFrom.x, step.pointerTo.x, t);
      this.y = lerp(step.pointerFrom.y, step.pointerTo.y, t);
      this.pushPointer();
      const live = this.resolveScroller(step.scroller) ?? scroller;
      const top = lerp(startScroll, endScroll, t);
      if (live) {
        live.scrollTop = top;
      }
      this.opts.onScrollProgress?.({
        active: true,
        t,
        scrollTop: top,
        maxScroll,
      });
    });

    this.pressed = false;
    this.pushPointer();
    this.opts.onScrollProgress?.({
      active: false,
      t: 1,
      scrollTop: endScroll,
      maxScroll,
    });
  }

  /**
   * Scroll until `target` center sits at `alignY`% of the scroller viewport.
   * Pointer + scrollTop share one `t`. Used so Discover scrolls to the SAME
   * card it later taps/opens — no A→B mismatch.
   */
  private async scrollToTarget(
    step: Extract<GestureScriptStep, { kind: 'scrollToTarget' }>,
  ): Promise<void> {
    const alignY = step.alignY ?? 48;
    const pointerX = step.pointerX ?? 52;

    let targetEl: HTMLElement | null = null;
    let scroller: HTMLElement | null = null;
    for (let i = 0; i < 24 && !this.cancelled; i++) {
      targetEl = this.resolveElement(step.target);
      scroller = this.resolveScroller();
      if (
        targetEl &&
        scroller &&
        scroller.scrollHeight > scroller.clientHeight + 1
      ) {
        break;
      }
      await this.delay(50);
    }
    if (!targetEl || !scroller) {
      return;
    }

    const startScroll = scroller.scrollTop;
    const maxScroll = Math.max(
      0,
      scroller.scrollHeight - scroller.clientHeight,
    );
    const tr = targetEl.getBoundingClientRect();
    const sr = scroller.getBoundingClientRect();
    // Under the same CSS transform, screen deltas match local scroll deltas
    // (transform cancels). Do NOT divide by scale — that overshoots.
    const targetCenterInView = tr.top + tr.height / 2 - sr.top;
    const desiredInView = (alignY / 100) * sr.height;
    const endScroll = Math.max(
      0,
      Math.min(maxScroll, startScroll + (targetCenterInView - desiredInView)),
    );
    const deltaY = endScroll - startScroll;

    if (Math.abs(deltaY) < 8) {
      this.x = pointerX;
      this.y = alignY;
      this.visible = true;
      this.pressed = false;
      this.pushPointer();
      await this.delay(200);
      return;
    }

    const travel = Math.min(26, Math.max(16, Math.abs(deltaY) / 16));
    await this.scrollSynced({
      kind: 'scrollSynced',
      pointerFrom: {
        x: pointerX,
        y:
          deltaY > 0
            ? Math.min(78, alignY + travel)
            : Math.max(22, alignY - travel),
      },
      pointerTo: { x: pointerX, y: alignY },
      deltaY,
      duration: step.duration,
      easing: step.easing ?? easeInOutCubic,
    });
  }

  private async drag(
    step: Extract<GestureScriptStep, { kind: 'drag' | 'dragTo' }>,
  ): Promise<void> {
    const fromX = this.x;
    const fromY = this.y;
    const scroller = this.opts.getScroller?.() ?? null;
    const startScroll = scroller?.scrollTop ?? 0;
    const endScroll =
      step.scrollDeltaY != null
        ? Math.max(0, startScroll + step.scrollDeltaY)
        : startScroll;
    const ease = step.easing ?? easeInOutCubic;

    this.pressed = true;
    this.visible = true;
    this.opts.onRipple?.(this.x, this.y);
    this.pushPointer();
    await this.delay(70);

    await this.animate(step.duration, (rawT) => {
      const t = ease(rawT);
      this.x = lerp(fromX, step.to.x, t);
      this.y = lerp(fromY, step.to.y, t);
      this.pushPointer();
      if (scroller && step.scrollDeltaY != null) {
        scroller.scrollTop = lerp(startScroll, endScroll, t);
      }
      step.onProgress?.(t, { x: this.x, y: this.y });
    });

    this.pressed = false;
    this.pushPointer();
  }

  // ---- clock / helpers -----------------------------------------------------

  private pushPointer(): void {
    const state: PointerState = {
      x: this.x,
      y: this.y,
      visible: this.visible,
      pressed: this.pressed,
    };
    this.opts.onPointer?.(state);
    const el = this.opts.getPointerEl?.();
    if (el) {
      el.style.left = `${this.x}%`;
      el.style.top = `${this.y}%`;
    }
  }

  private async tweenPointer(
    toX: number,
    toY: number,
    duration: number,
    ease: EasingFn,
  ): Promise<void> {
    const fromX = this.x;
    const fromY = this.y;
    this.visible = true;
    this.pushPointer();
    await this.animate(duration, (rawT) => {
      const t = ease(rawT);
      this.x = lerp(fromX, toX, t);
      this.y = lerp(fromY, toY, t);
      this.pushPointer();
    });
  }

  /** Single rAF timeline — `onFrame` receives raw t in [0,1]. */
  private animate(
    duration: number,
    onFrame: (t: number) => void,
  ): Promise<void> {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = (now: number): void => {
        if (this.cancelled) {
          resolve();
          return;
        }
        const t = duration <= 0 ? 1 : Math.min(1, (now - t0) / duration);
        onFrame(t);
        if (t < 1) {
          this.raf = requestAnimationFrame(tick);
        } else {
          this.raf = 0;
          resolve();
        }
      };
      this.raf = requestAnimationFrame(tick);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.cancelled) {
        resolve();
        return;
      }
      const id = window.setTimeout(() => {
        this.timers = this.timers.filter((t) => t !== id);
        resolve();
      }, ms);
      this.timers.push(id);
    });
  }

  private resolveScroller(
    override?: HTMLElement | (() => HTMLElement | null),
  ): HTMLElement | null {
    if (typeof override === 'function') {
      return override();
    }
    if (override) {
      return override;
    }
    return this.opts.getScroller?.() ?? null;
  }

  private resolvePoint(target: PointOrSelector): PointPct | null {
    if (typeof target !== 'string') {
      return target;
    }
    const root = this.opts.getStageRoot?.();
    const el = this.resolveElement(target);
    if (!root || !el) {
      return null;
    }
    return elementCenterPct(el, root);
  }

  private resolveElement(target: PointOrSelector): HTMLElement | null {
    if (typeof target !== 'string') {
      return null;
    }
    const root = this.opts.getStageRoot?.();
    if (!root) {
      return null;
    }
    const incoming =
      (root.querySelector('.source__layer--in') as HTMLElement | null) ?? root;
    return (
      (incoming.querySelector(target) as HTMLElement | null) ??
      (root.querySelector(target) as HTMLElement | null)
    );
  }

  /** Wait briefly for late-mounted UI (profile Follow, map drawer, etc.). */
  private async resolvePointWithRetry(
    target: PointOrSelector,
    attempts = 12,
  ): Promise<PointPct | null> {
    for (let i = 0; i < attempts; i++) {
      const point = this.resolvePoint(target);
      if (point) {
        return point;
      }
      if (typeof target !== 'string') {
        return null;
      }
      await this.delay(50);
    }
    return null;
  }

  private maybeDispatch(type: 'pointerdown' | 'pointerup' | 'click'): void {
    if (this.opts.dispatchDomEvents === false) {
      return;
    }
    const root = this.opts.getStageRoot?.();
    if (!root) {
      return;
    }
    const hit = hitTestAtPct(root, this.x, this.y);
    if (!hit) {
      return;
    }
    const { clientX, clientY } = pctToClient(root, this.x, this.y);
    if (type === 'click') {
      hit.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          view: window,
        }),
      );
      return;
    }
    const pointerType = type === 'pointerdown' ? 'pointerdown' : 'pointerup';
    hit.dispatchEvent(
      new PointerEvent(pointerType, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        clientX,
        clientY,
      }),
    );
    const mouseType = type === 'pointerdown' ? 'mousedown' : 'mouseup';
    hit.dispatchEvent(
      new MouseEvent(mouseType, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        view: window,
      }),
    );
  }
}

/** Public alias matching the intro-gesture-player naming. */
export { SyncedGestureController as IntroGesturePlayer };
/** Back-compat alias used by early drafts. */
export { SyncedGestureController as SyncedGesturePlayer };

export function elementCenterPct(el: HTMLElement, root: HTMLElement): PointPct {
  const er = el.getBoundingClientRect();
  const rr = root.getBoundingClientRect();
  const x = ((er.left + er.width / 2 - rr.left) / Math.max(1, rr.width)) * 100;
  const y = ((er.top + er.height / 2 - rr.top) / Math.max(1, rr.height)) * 100;
  return { x, y };
}

function pctToClient(
  root: HTMLElement,
  xPct: number,
  yPct: number,
): { clientX: number; clientY: number } {
  const rr = root.getBoundingClientRect();
  return {
    clientX: rr.left + (xPct / 100) * rr.width,
    clientY: rr.top + (yPct / 100) * rr.height,
  };
}

function hitTestAtPct(
  root: HTMLElement,
  xPct: number,
  yPct: number,
): HTMLElement | null {
  const { clientX, clientY } = pctToClient(root, xPct, yPct);
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const node of stack) {
    if (!(node instanceof HTMLElement)) {
      continue;
    }
    if (node === root || root.contains(node)) {
      // Skip the soft-dot itself if it's in the stack.
      if (node.classList.contains('gesture__touch')) {
        continue;
      }
      if (node.closest?.('.gesture')) {
        continue;
      }
      return node;
    }
  }
  return null;
}
