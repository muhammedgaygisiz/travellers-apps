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
const TIP_AUTO_MS = 4800;
const FOCUS_MORPH_MS = 380;

type ArcFilter = IntroStorySceneId | 'all';

/**
 * I — Soft Whisper: content-first progressive disclosure.
 * No modal card stacks. At most one chrome button (Skip). Light Outfit
 * captions fade near the focus; soft grayscale shine; auto-advance +
 * tap-stage to advance. Find → Share → Tribe → Go.
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
    const pad = Math.max(10, Math.min(16, rect.width * 0.05));
    const w = rect.width + pad * 2;
    let h = rect.height + pad * 2;
    const x = rect.left - pad;
    let y = rect.top - pad;
    // Wide CTAs: puff into a soft oval so the cutout doesn't read as a focus rect.
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
      '--shine-r': '50%',
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

  /** Caption position via CSS vars — compose with fade/slide keyframes. */
  readonly tipStyle = computed(() => {
    const rect = this.focusRect();
    if (!rect) {
      return {
        '--tip-top': 'auto',
        '--tip-bottom': '1.35rem',
        '--tip-left': '50%',
        '--tip-y': '0px',
      };
    }
    const stage = this.stage()?.nativeElement;
    const w = stage?.clientWidth || 390;
    const tipW = Math.min(17 * 16, w - 32);
    const cx = rect.left + rect.width / 2;
    const left = Math.min(Math.max(cx, tipW / 2 + 16), w - tipW / 2 - 16);
    const gap = 18;

    if (this.tipAbove()) {
      return {
        '--tip-top': `${Math.max(12, rect.top - gap)}px`,
        '--tip-bottom': 'auto',
        '--tip-left': `${left}px`,
        '--tip-y': '-100%',
      };
    }
    return {
      '--tip-top': `${rect.top + rect.height + gap}px`,
      '--tip-bottom': 'auto',
      '--tip-left': `${left}px`,
      '--tip-y': '0%',
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
