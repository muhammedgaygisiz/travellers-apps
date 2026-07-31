import {
  afterNextRender,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  NgZone,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  INTRO_STORY_SCENES,
  type IntroStorySceneId,
} from '../intro-story.model';
import { RealUiSourceComponent } from '../source-real-ui/real-ui-source.component';
import {
  tipsForArc,
  type ProgressiveTip,
  type TipFallbackPct,
} from '../progressive-tips.model';

const TIP_AUTO_MS = 6800;

type ArcFilter = IntroStorySceneId | 'all';

interface LocalRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * E — Progressive disclosure: one coach-mark tip at a time over real UI.
 * Teaching order is fixed; Next (or auto-advance) moves the spotlight.
 *
 * Note: tip cards include Next/Back chrome. For a calmer content-first
 * alternative (≤1 Skip, whisper captions, no modal stacks), see
 * variant-i-soft-whisper (`Prototypes/Intro Story/I Soft Whisper`).
 */
@Component({
  selector: 'intro-progressive-disclosure',
  templateUrl: './progressive-disclosure.component.html',
  styleUrl: './progressive-disclosure.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RealUiSourceComponent],
})
export class ProgressiveDisclosureComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  /** `all` walks every arc; a scene id locks to that concept beat. */
  arc = input<ArcFilter>('all');
  autoAdvance = input(true);
  badge = input('Progressive');

  readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  readonly source = viewChild(RealUiSourceComponent);

  readonly tipIndex = signal(0);
  readonly paused = signal(false);
  readonly animKey = signal(0);
  readonly anchorLocal = signal<LocalRect | null>(null);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private measureTimers: number[] = [];
  private startedAt = 0;
  private remaining = TIP_AUTO_MS;

  readonly tips = computed(() => tipsForArc(this.arc()));

  readonly tip = computed((): ProgressiveTip | null => {
    const list = this.tips();
    if (!list.length) {
      return null;
    }
    return list[Math.min(this.tipIndex(), list.length - 1)] ?? null;
  });

  readonly scene = computed(() => {
    const tip = this.tip();
    const id = tip?.arc ?? 'discover';
    return INTRO_STORY_SCENES.find((s) => s.id === id) ?? INTRO_STORY_SCENES[0];
  });

  readonly beatId = computed(
    (): IntroStorySceneId => this.tip()?.arc ?? 'discover',
  );

  readonly coach = computed(() => this.tip()?.cue ?? null);

  readonly tipCount = computed(() => this.tips().length);

  readonly isLast = computed(() => this.tipIndex() >= this.tips().length - 1);

  readonly progressLabel = computed(
    () => `${this.tipIndex() + 1} / ${this.tipCount()}`,
  );

  readonly tipAbove = computed(() => {
    const rect = this.anchorLocal();
    if (!rect) {
      return false;
    }
    const stage = this.stage()?.nativeElement;
    const h = stage?.clientHeight || 700;
    return rect.top + rect.height / 2 > h * 0.52;
  });

  readonly cardStyle = computed(() => {
    const rect = this.anchorLocal();
    if (!rect) {
      return { top: '42%', transform: 'translate(-50%, -50%)' };
    }
    const gap = 14;
    if (this.tipAbove()) {
      return {
        top: `${Math.max(12, rect.top - gap)}px`,
        transform: 'translate(-50%, -100%)',
      };
    }
    return {
      top: `${rect.top + rect.height + gap}px`,
      transform: 'translateX(-50%)',
    };
  });

  readonly shineVars = computed(() => {
    const rect = this.anchorLocal();
    const stage = this.stage()?.nativeElement;
    const sw = stage?.clientWidth || 390;
    const sh = stage?.clientHeight || 700;
    if (!rect) {
      return {
        '--shine-x': `${sw * 0.5}px`,
        '--shine-y': `${sh * 0.42}px`,
        '--shine-w': '0px',
        '--shine-h': '0px',
      };
    }
    const pad = Math.max(10, Math.min(16, rect.width * 0.05));
    const w = rect.width + pad * 2;
    let h = rect.height + pad * 2;
    const x = rect.left - pad;
    let y = rect.top - pad;
    if (w / Math.max(1, h) > 2.1) {
      const targetH = Math.min(w / 1.55, h + 56);
      const dy = (targetH - h) / 2;
      h = targetH;
      y -= dy;
    }
    return {
      '--shine-x': `${x}px`,
      '--shine-y': `${y}px`,
      '--shine-w': `${w}px`,
      '--shine-h': `${h}px`,
    };
  });

  readonly arrowStyle = computed(() => {
    const rect = this.anchorLocal();
    if (!rect) {
      return null;
    }
    const cx = rect.left + rect.width / 2;
    if (this.tipAbove()) {
      return {
        left: `${cx}px`,
        top: `${rect.top - 2}px`,
        transform: 'translate(-50%, -100%) rotate(180deg)',
      };
    }
    return {
      left: `${cx}px`,
      top: `${rect.top + rect.height + 2}px`,
      transform: 'translateX(-50%)',
    };
  });

  constructor() {
    effect(() => {
      // Reset tip cursor when the arc filter changes (Storybook controls / stories).
      const list = tipsForArc(this.arc());
      if (list.length && this.tipIndex() >= list.length) {
        this.tipIndex.set(0);
      }
    });

    effect(() => {
      // Re-bind when arc filter or tip changes.
      this.arc();
      const tip = this.tip();
      if (!tip) {
        return;
      }
      this.scheduleMeasure();
      if (this.autoAdvance() && !this.paused()) {
        this.restartTimer();
      }
    });

    afterNextRender(() => {
      this.scheduleMeasure();
      this.destroyRef.onDestroy(() => {
        this.clearTimer();
        this.clearMeasureTimers();
      });
    });
  }

  nextTip(event?: Event): void {
    event?.stopPropagation();
    if (this.isLast()) {
      this.tipIndex.set(0);
      this.animKey.update((k) => k + 1);
      this.restartTimer();
      return;
    }
    this.tipIndex.update((i) => i + 1);
    this.animKey.update((k) => k + 1);
    this.restartTimer();
  }

  prevTip(event?: Event): void {
    event?.stopPropagation();
    if (this.tipIndex() === 0) {
      this.restartTimer();
      return;
    }
    this.tipIndex.update((i) => i - 1);
    this.animKey.update((k) => k + 1);
    this.restartTimer();
  }

  onPressStart(): void {
    if (!this.autoAdvance() || this.paused()) {
      return;
    }
    this.paused.set(true);
    this.clearTimer();
    this.remaining = Math.max(0, TIP_AUTO_MS - (Date.now() - this.startedAt));
  }

  onPressEnd(): void {
    if (!this.paused()) {
      return;
    }
    this.paused.set(false);
    this.startTimer(this.remaining);
  }

  tipDuration(): number {
    return TIP_AUTO_MS;
  }

  private restartTimer(): void {
    this.remaining = TIP_AUTO_MS;
    this.paused.set(false);
    if (this.autoAdvance()) {
      this.startTimer();
    } else {
      this.clearTimer();
    }
  }

  private startTimer(duration = TIP_AUTO_MS): void {
    this.clearTimer();
    if (!this.autoAdvance()) {
      return;
    }
    this.startedAt = Date.now();
    this.remaining = duration;
    this.timer = setTimeout(
      () => this.zone.run(() => this.nextTip()),
      duration,
    );
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private clearMeasureTimers(): void {
    for (const id of this.measureTimers) {
      window.clearTimeout(id);
    }
    this.measureTimers = [];
  }

  private scheduleMeasure(): void {
    this.clearMeasureTimers();
    const run = (): void => this.zone.run(() => this.measureAnchor());
    requestAnimationFrame(run);
    this.measureTimers.push(window.setTimeout(run, 80));
    this.measureTimers.push(window.setTimeout(run, 280));
    this.measureTimers.push(window.setTimeout(run, 520));
  }

  private measureAnchor(): void {
    const tip = this.tip();
    const stageEl = this.stage()?.nativeElement;
    if (!tip || !stageEl) {
      this.anchorLocal.set(null);
      return;
    }

    const stageRect = stageEl.getBoundingClientRect();
    let target: HTMLElement | null = null;

    if (tip.anchor) {
      // Prefer the live incoming layer so outgoing dual-layer ghosts are ignored.
      const live =
        (stageEl.querySelector('.source__layer--in') as HTMLElement | null) ??
        stageEl;
      target = live.querySelector(tip.anchor) as HTMLElement | null;
      if (!target) {
        target = stageEl.querySelector(tip.anchor) as HTMLElement | null;
      }
    }

    if (target) {
      const r = target.getBoundingClientRect();
      if (r.width > 2 && r.height > 2) {
        this.anchorLocal.set({
          top: r.top - stageRect.top,
          left: r.left - stageRect.left,
          width: r.width,
          height: r.height,
        });
        this.cdr.markForCheck();
        return;
      }
    }

    this.anchorLocal.set(
      this.fallbackLocalRect(stageEl, stageRect, tip.fallbackPct),
    );
    this.cdr.markForCheck();
  }

  private fallbackLocalRect(
    stageEl: HTMLElement,
    stageRect: DOMRect,
    pct: TipFallbackPct,
  ): LocalRect {
    const native =
      (stageEl.querySelector('.source__native') as HTMLElement | null) ?? null;
    const box = native?.getBoundingClientRect() ?? stageRect;
    const w = (pct.w / 100) * box.width;
    const h = (pct.h / 100) * box.height;
    const left = box.left - stageRect.left + (pct.x / 100) * box.width - w / 2;
    const top = box.top - stageRect.top + (pct.y / 100) * box.height - h / 2;
    return { top, left, width: w, height: h };
  }
}
