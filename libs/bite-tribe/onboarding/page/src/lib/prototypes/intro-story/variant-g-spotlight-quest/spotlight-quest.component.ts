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
  questTipsForArc,
  type ProgressiveTip,
  type TipLocalRect,
} from '../progressive-tips.model';

const STEP_AUTO_MS = 5600;
const CHECK_HOLD_MS = 520;

type ArcFilter = IntroStorySceneId | 'all';

interface QuestItem {
  id: IntroStorySceneId;
  label: string;
  done: boolean;
  current: boolean;
}

/**
 * G — Spotlight Quest: persistent mini checklist with vignette spotlight.
 * Completing a step checks off with micro-animation, then advances.
 */
@Component({
  selector: 'intro-spotlight-quest',
  templateUrl: './spotlight-quest.component.html',
  styleUrl: './spotlight-quest.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RealUiSourceComponent],
})
export class SpotlightQuestComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  arc = input<ArcFilter>('all');
  autoAdvance = input(true);
  badge = input('Quest');

  readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  readonly source = viewChild(RealUiSourceComponent);

  readonly tipIndex = signal(0);
  readonly paused = signal(false);
  readonly animKey = signal(0);
  readonly checking = signal(false);
  readonly justCheckedId = signal<string | null>(null);
  readonly anchorLocal = signal<TipLocalRect | null>(null);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private checkTimer: ReturnType<typeof setTimeout> | null = null;
  private measureTimers: number[] = [];
  private startedAt = 0;
  private remaining = STEP_AUTO_MS;

  readonly tips = computed(() => questTipsForArc(this.arc()));

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

  readonly checklist = computed((): QuestItem[] => {
    const labels: Record<IntroStorySceneId, string> = {
      discover: 'Discover',
      share: 'Share',
      tribe: 'Tribe',
      go: 'Go',
    };
    const list = this.tips();
    const idx = this.tipIndex();
    const checkingId = this.justCheckedId();
    return list.map((t, i) => ({
      id: t.arc,
      label: labels[t.arc],
      done: i < idx || checkingId === t.id,
      current: i === idx && checkingId !== t.id,
    }));
  });

  readonly completedCount = computed(
    () => this.checklist().filter((c) => c.done).length,
  );

  readonly spotlightStyle = computed(() => {
    const rect = this.anchorLocal();
    if (!rect) {
      return null;
    }
    const pad = 10;
    return {
      top: `${rect.top - pad}px`,
      left: `${rect.left - pad}px`,
      width: `${rect.width + pad * 2}px`,
      height: `${rect.height + pad * 2}px`,
    };
  });

  readonly tipDockStyle = computed(() => {
    const rect = this.anchorLocal();
    if (!rect) {
      return { bottom: '1rem' };
    }
    const stage = this.stage()?.nativeElement;
    const h = stage?.clientHeight || 700;
    // Keep tip dock clear of the spotlight when the hotspot is low.
    if (rect.top + rect.height > h * 0.62) {
      return { bottom: 'auto', top: '0.85rem' };
    }
    return { bottom: '1rem', top: 'auto' };
  });

  constructor() {
    effect(() => {
      const list = questTipsForArc(this.arc());
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
      if (this.autoAdvance() && !this.paused() && !this.checking()) {
        this.restartTimer();
      }
    });

    afterNextRender(() => {
      this.scheduleMeasure();
      this.destroyRef.onDestroy(() => {
        this.clearTimer();
        this.clearCheckTimer();
        this.clearMeasureTimers();
      });
    });
  }

  completeStep(event?: Event): void {
    event?.stopPropagation();
    if (this.checking()) {
      return;
    }
    const tip = this.tip();
    if (!tip) {
      return;
    }

    this.clearTimer();
    this.checking.set(true);
    this.justCheckedId.set(tip.id);
    this.animKey.update((k) => k + 1);

    this.clearCheckTimer();
    this.checkTimer = setTimeout(() => {
      this.zone.run(() => {
        this.justCheckedId.set(null);
        this.checking.set(false);
        if (this.isLast()) {
          this.tipIndex.set(0);
        } else {
          this.tipIndex.update((i) => i + 1);
        }
        this.animKey.update((k) => k + 1);
        this.restartTimer();
      });
    }, CHECK_HOLD_MS);
  }

  jumpTo(index: number, event?: Event): void {
    event?.stopPropagation();
    if (this.checking() || index === this.tipIndex()) {
      return;
    }
    this.tipIndex.set(index);
    this.justCheckedId.set(null);
    this.checking.set(false);
    this.animKey.update((k) => k + 1);
    this.restartTimer();
  }

  onPressStart(): void {
    if (!this.autoAdvance() || this.paused() || this.checking()) {
      return;
    }
    this.paused.set(true);
    this.clearTimer();
    this.remaining = Math.max(0, STEP_AUTO_MS - (Date.now() - this.startedAt));
  }

  onPressEnd(): void {
    if (!this.paused()) {
      return;
    }
    this.paused.set(false);
    this.startTimer(this.remaining);
  }

  tipDuration(): number {
    return STEP_AUTO_MS;
  }

  private restartTimer(): void {
    this.remaining = STEP_AUTO_MS;
    this.paused.set(false);
    if (this.autoAdvance() && !this.checking()) {
      this.startTimer();
    } else {
      this.clearTimer();
    }
  }

  private startTimer(duration = STEP_AUTO_MS): void {
    this.clearTimer();
    if (!this.autoAdvance() || this.checking()) {
      return;
    }
    this.startedAt = Date.now();
    this.remaining = duration;
    this.timer = setTimeout(
      () => this.zone.run(() => this.completeStep()),
      duration,
    );
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private clearCheckTimer(): void {
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = null;
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
    this.anchorLocal.set(measureTipInStage(stageEl, tip));
    this.cdr.markForCheck();
  }
}
