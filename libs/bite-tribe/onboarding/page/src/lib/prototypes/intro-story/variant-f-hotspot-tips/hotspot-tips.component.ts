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

const TIP_AUTO_MS = 6400;

type ArcFilter = IntroStorySceneId | 'all';

interface HotspotMark {
  tip: ProgressiveTip;
  rect: TipLocalRect;
  active: boolean;
}

/**
 * F — Hotspot Tips: subtle pulsing dots on key UI, one focused tip at a time.
 * Compact floating pill (Material/iOS tip style) near the active hotspot.
 */
@Component({
  selector: 'intro-hotspot-tips',
  templateUrl: './hotspot-tips.component.html',
  styleUrl: './hotspot-tips.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RealUiSourceComponent],
})
export class HotspotTipsComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  arc = input<ArcFilter>('all');
  autoAdvance = input(true);
  badge = input('Hotspots');

  readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  readonly source = viewChild(RealUiSourceComponent);

  readonly tipIndex = signal(0);
  readonly paused = signal(false);
  readonly animKey = signal(0);
  readonly hotspots = signal<HotspotMark[]>([]);

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

  readonly activeHotspot = computed(
    () => this.hotspots().find((h) => h.active) ?? null,
  );

  /** Prefer a floating pill near the hotspot; flip above when low on screen. */
  readonly pillStyle = computed(() => {
    const mark = this.activeHotspot();
    if (!mark) {
      return {
        top: 'auto',
        bottom: '1.1rem',
        left: '50%',
        transform: 'translateX(-50%)',
      };
    }
    const stage = this.stage()?.nativeElement;
    const h = stage?.clientHeight || 700;
    const w = stage?.clientWidth || 390;
    const cx = mark.rect.left + mark.rect.width / 2;
    const cy = mark.rect.top + mark.rect.height / 2;
    const pillW = Math.min(17.5 * 16, w - 24);
    const left = Math.min(Math.max(cx, pillW / 2 + 12), w - pillW / 2 - 12);

    if (cy > h * 0.58) {
      return {
        top: `${Math.max(12, mark.rect.top - 12)}px`,
        bottom: 'auto',
        left: `${left}px`,
        transform: 'translate(-50%, -100%)',
      };
    }
    return {
      top: `${mark.rect.top + mark.rect.height + 14}px`,
      bottom: 'auto',
      left: `${left}px`,
      transform: 'translateX(-50%)',
    };
  });

  readonly useSheet = computed(() => {
    const mark = this.activeHotspot();
    if (!mark) {
      return true;
    }
    const stage = this.stage()?.nativeElement;
    const h = stage?.clientHeight || 700;
    // Very tall anchors (feed cards) → compact bottom sheet feels cleaner.
    return mark.rect.height > h * 0.28;
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

  focusTip(tipId: string, event?: Event): void {
    event?.stopPropagation();
    const idx = this.tips().findIndex((t) => t.id === tipId);
    if (idx < 0 || idx === this.tipIndex()) {
      return;
    }
    this.tipIndex.set(idx);
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

  hotspotStyle(mark: HotspotMark): Record<string, string> {
    const cx = mark.rect.left + mark.rect.width / 2;
    const cy = mark.rect.top + mark.rect.height / 2;
    return {
      left: `${cx}px`,
      top: `${cy}px`,
    };
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
    const run = (): void => this.zone.run(() => this.measureHotspots());
    requestAnimationFrame(run);
    this.measureTimers.push(window.setTimeout(run, 80));
    this.measureTimers.push(window.setTimeout(run, 280));
    this.measureTimers.push(window.setTimeout(run, 520));
  }

  private measureHotspots(): void {
    const stageEl = this.stage()?.nativeElement;
    const active = this.tip();
    const list = this.tips();
    if (!stageEl || !active) {
      this.hotspots.set([]);
      return;
    }

    // Show dormant pulses for tips sharing the same coach screen.
    const sameScreen = list.filter((t) => t.cue.screen === active.cue.screen);
    const marks: HotspotMark[] = sameScreen.map((t) => ({
      tip: t,
      rect: measureTipInStage(stageEl, t),
      active: t.id === active.id,
    }));
    this.hotspots.set(marks);
    this.cdr.markForCheck();
  }
}
