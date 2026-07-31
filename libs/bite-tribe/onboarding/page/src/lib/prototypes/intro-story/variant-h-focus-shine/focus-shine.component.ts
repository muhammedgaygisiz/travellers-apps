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
  measureTipInStage,
  tipsForArc,
  type ProgressiveTip,
  type TipLocalRect,
} from '../progressive-tips.model';

const TIP_AUTO_MS = 5000;
/** Hole morph + veil settle — sweet but snappy. */
const FOCUS_MORPH_MS = 340;

type ArcFilter = IntroStorySceneId | 'all';

/**
 * H — Focus Shine: non-focus UI fades + grayscales; the focal control
 * stays full color and softly glows. Short tip nearby; Find → Share → Tribe → Go.
 */
@Component({
  selector: 'intro-focus-shine',
  templateUrl: './focus-shine.component.html',
  styleUrl: './focus-shine.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RealUiSourceComponent],
})
export class FocusShineComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  arc = input<ArcFilter>('all');
  autoAdvance = input(true);
  badge = input('Focus Shine');

  readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  readonly source = viewChild(RealUiSourceComponent);

  readonly tipIndex = signal(0);
  readonly paused = signal(false);
  readonly animKey = signal(0);
  readonly focusRect = signal<TipLocalRect | null>(null);
  /** True while the hole is morphing — softens tip until settle. */
  readonly morphing = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private measureTimers: number[] = [];
  private morphTimer: ReturnType<typeof setTimeout> | null = null;
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

  /** CSS vars drive the morphing cutout — keep the veil mounted. */
  readonly shineVars = computed(() => {
    const rect = this.focusRect();
    const stage = this.stage()?.nativeElement;
    const sw = stage?.clientWidth || 390;
    const sh = stage?.clientHeight || 700;
    if (!rect) {
      return {
        '--shine-x': `${sw * 0.5}px`,
        '--shine-y': `${sh * 0.42}px`,
        '--shine-w': '0px',
        '--shine-h': '0px',
        '--shine-r': '0.85rem',
      };
    }
    const pad = Math.max(8, Math.min(14, rect.width * 0.04));
    const radius =
      rect.height > sh * 0.22
        ? '1.05rem'
        : rect.width < 72
          ? '999px'
          : '0.9rem';
    return {
      '--shine-x': `${rect.left - pad}px`,
      '--shine-y': `${rect.top - pad}px`,
      '--shine-w': `${rect.width + pad * 2}px`,
      '--shine-h': `${rect.height + pad * 2}px`,
      '--shine-r': radius,
    };
  });

  readonly tipAbove = computed(() => {
    const rect = this.focusRect();
    if (!rect) {
      return false;
    }
    const stage = this.stage()?.nativeElement;
    const h = stage?.clientHeight || 700;
    return rect.top + rect.height / 2 > h * 0.55;
  });

  /** Prefer a slim tip near the focus; flip above when low. */
  readonly tipStyle = computed(() => {
    const rect = this.focusRect();
    if (!rect) {
      return {
        top: 'auto',
        bottom: '1.15rem',
        left: '50%',
        transform: 'translateX(-50%)',
      };
    }
    const stage = this.stage()?.nativeElement;
    const w = stage?.clientWidth || 390;
    const tipW = Math.min(16.5 * 16, w - 28);
    const cx = rect.left + rect.width / 2;
    const left = Math.min(Math.max(cx, tipW / 2 + 14), w - tipW / 2 - 14);
    const gap = 16;

    if (this.tipAbove()) {
      return {
        top: `${Math.max(10, rect.top - gap)}px`,
        bottom: 'auto',
        left: `${left}px`,
        transform: 'translate(-50%, -100%)',
      };
    }
    return {
      top: `${rect.top + rect.height + gap}px`,
      bottom: 'auto',
      left: `${left}px`,
      transform: 'translateX(-50%)',
    };
  });

  constructor() {
    effect(() => {
      const list = tipsForArc(this.arc());
      if (list.length && this.tipIndex() >= list.length) {
        this.tipIndex.set(0);
      }
    });

    effect(() => {
      this.arc();
      const tip = this.tip();
      if (!tip) {
        return;
      }
      this.beginMorph();
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
        if (this.morphTimer) {
          clearTimeout(this.morphTimer);
        }
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

  private beginMorph(): void {
    this.morphing.set(true);
    if (this.morphTimer) {
      clearTimeout(this.morphTimer);
    }
    this.morphTimer = setTimeout(
      () =>
        this.zone.run(() => {
          this.morphing.set(false);
          this.cdr.markForCheck();
        }),
      FOCUS_MORPH_MS + 40,
    );
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
    const run = (): void => this.zone.run(() => this.measureFocus());
    requestAnimationFrame(run);
    this.measureTimers.push(window.setTimeout(run, 80));
    this.measureTimers.push(window.setTimeout(run, 280));
    this.measureTimers.push(window.setTimeout(run, 520));
  }

  private measureFocus(): void {
    const tip = this.tip();
    const stageEl = this.stage()?.nativeElement;
    if (!tip || !stageEl) {
      this.focusRect.set(null);
      return;
    }
    this.focusRect.set(measureTipInStage(stageEl, tip));
    this.cdr.markForCheck();
  }
}
