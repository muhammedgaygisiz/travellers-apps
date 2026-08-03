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

/** Calm dwell — long enough to read a whisper line. */
const TIP_AUTO_MS = 5400;
const FOCUS_MORPH_MS = 480;

type ArcFilter = IntroStorySceneId | 'all';

/**
 * I — Soft Whisper: content-first progressive disclosure.
 * No modal card stacks. At most one chrome button (Skip). Outfit
 * captions live below the phone as page chrome; soft grayscale shine
 * on stage; auto-advance + tap-stage to advance. Find → Share → Tribe → Go.
 */
@Component({
  selector: 'intro-soft-whisper',
  templateUrl: './soft-whisper.component.html',
  styleUrl: './soft-whisper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RealUiSourceComponent],
})
export class SoftWhisperComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  arc = input<ArcFilter>('all');
  autoAdvance = input(true);
  badge = input('Soft Whisper');
  /** Show the single optional Skip text control. */
  showSkip = input(true);

  readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  readonly source = viewChild(RealUiSourceComponent);

  readonly tipIndex = signal(0);
  readonly dismissed = signal(false);
  readonly animKey = signal(0);
  readonly focusRect = signal<TipLocalRect | null>(null);
  readonly morphing = signal(false);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private measureTimers: number[] = [];
  private morphTimer: ReturnType<typeof setTimeout> | null = null;
  /** Ignore the click that follows Skip so it doesn’t also advance. */
  private ignoreStageTapUntil = 0;

  readonly tips = computed(() => tipsForArc(this.arc()));

  readonly tip = computed((): ProgressiveTip | null => {
    if (this.dismissed()) {
      return null;
    }
    const list = this.tips();
    if (!list.length) {
      return null;
    }
    return list[Math.min(this.tipIndex(), list.length - 1)] ?? null;
  });

  readonly scene = computed(() => {
    const list = this.tips();
    const active =
      list[Math.min(this.tipIndex(), Math.max(0, list.length - 1))] ?? null;
    const id = active?.arc ?? 'discover';
    return INTRO_STORY_SCENES.find((s) => s.id === id) ?? INTRO_STORY_SCENES[0];
  });

  readonly beatId = computed((): IntroStorySceneId => {
    const list = this.tips();
    return (
      list[Math.min(this.tipIndex(), Math.max(0, list.length - 1))]?.arc ??
      'discover'
    );
  });

  readonly coach = computed(() => this.tip()?.cue ?? null);

  readonly isLast = computed(() => this.tipIndex() >= this.tips().length - 1);

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
    const pad = Math.max(16, Math.min(28, rect.width * 0.1));
    let w = rect.width + pad * 2;
    let h = rect.height + pad * 2;
    let x = rect.left - pad;
    let y = rect.top - pad;
    // Soft oval bias: widen short axes so cutouts never read as hard cards.
    const ratio = w / Math.max(1, h);
    if (ratio > 2.0) {
      const targetH = Math.min(Math.max(h * 1.55, w / 1.85), h + 64);
      const dy = (targetH - h) / 2;
      h = targetH;
      y -= dy;
    } else if (ratio < 0.85) {
      const targetW = Math.min(w * 1.35, sw * 0.78);
      const dx = (targetW - w) / 2;
      w = targetW;
      x -= dx;
    } else {
      // Mild oval puff for near-square targets (cards).
      const growW = Math.min(36, w * 0.08);
      const growH = Math.min(48, h * 0.1);
      w += growW;
      h += growH;
      x -= growW / 2;
      y -= growH / 2;
    }
    return {
      '--shine-x': `${x}px`,
      '--shine-y': `${y}px`,
      '--shine-w': `${w}px`,
      '--shine-h': `${h}px`,
      '--shine-r': '50%',
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
      this.dismissed();
      const tip = this.tip();
      if (!tip) {
        this.clearTimer();
        return;
      }
      this.beginMorph();
      this.scheduleMeasure();
      if (this.autoAdvance()) {
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

  /** Tap-anywhere on stage advances — not a chrome button. */
  onStageTap(event: Event): void {
    if (Date.now() < this.ignoreStageTapUntil) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest('.sw__skip')) {
      return;
    }
    if (this.dismissed()) {
      this.dismissed.set(false);
      this.tipIndex.set(0);
      this.animKey.update((k) => k + 1);
      this.restartTimer();
      return;
    }
    this.nextTip();
  }

  nextTip(): void {
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

  /** Sole chrome button — quietly leave the tour; tap stage to resume. */
  skipTour(event: Event): void {
    event.stopPropagation();
    this.ignoreStageTapUntil = Date.now() + 400;
    this.dismissed.set(true);
    this.clearTimer();
    this.focusRect.set(null);
    this.cdr.markForCheck();
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
    if (this.autoAdvance() && !this.dismissed()) {
      this.startTimer();
    } else {
      this.clearTimer();
    }
  }

  private startTimer(duration = TIP_AUTO_MS): void {
    this.clearTimer();
    if (!this.autoAdvance() || this.dismissed()) {
      return;
    }
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
    if (this.dismissed()) {
      this.focusRect.set(null);
      return;
    }
    const run = (): void => this.zone.run(() => this.measureFocus());
    requestAnimationFrame(run);
    this.measureTimers.push(window.setTimeout(run, 80));
    this.measureTimers.push(window.setTimeout(run, 280));
    this.measureTimers.push(window.setTimeout(run, 520));
    this.measureTimers.push(window.setTimeout(run, 900));
    this.measureTimers.push(window.setTimeout(run, 1400));
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
