import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { IntroStorySceneId } from '../intro-story.model';
import {
  INTRO_BEAT_SCRIPTS,
  SoftDotPointerComponent,
  SyncedGestureController,
  REPLAY_FADE_MS,
  REPLAY_SETTLE_MS,
  type GestureEmit,
  type GestureScriptStep,
} from '../gesture';

export type IntroStageAction = GestureEmit;

/** How to continue after a beat script finishes (no mid-cheer hard cut). */
export type IntroGestureEndBehavior =
  /** Soft fade + restart the same beat after settle. */
  | 'soft-replay'
  /** Emit completed — parent advances chapter / shows finale. */
  | 'emit-complete'
  /** Legacy immediate loop (avoid). */
  | 'hard-loop';

type IonContentEl = HTMLElement & {
  getScrollElement?: () => Promise<HTMLElement>;
  scrollEl?: HTMLElement;
};

/**
 * Thin Angular shell around SyncedGestureController + SoftDotPointer.
 * Timing/sync lives in the gesture framework — this only binds DOM + emits.
 */
@Component({
  selector: 'intro-gesture-layer',
  templateUrl: './intro-gesture-layer.component.html',
  styleUrl: './intro-gesture-layer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SoftDotPointerComponent],
})
export class IntroGestureLayerComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  beat = input.required<IntroStorySceneId>();
  stageRoot = input.required<HTMLElement>();
  enabled = input(true);
  /** When set, plays this script instead of the canonical beat script. */
  steps = input<GestureScriptStep[] | null>(null);
  /** @deprecated Prefer endBehavior — kept for flow stories. */
  loop = input(false);
  endBehavior = input<IntroGestureEndBehavior>('soft-replay');

  action = output<IntroStageAction>();
  /** Fires when the script reaches its cheerful final frame (before soft replay). */
  completed = output<void>();

  readonly fingerVisible = signal(false);
  readonly fingerX = signal(50);
  readonly fingerY = signal(70);
  readonly fingerPressed = signal(false);
  readonly ripple = signal<{ x: number; y: number; key: number } | null>(null);
  readonly scrollThumb = signal<{
    active: boolean;
    topPct: number;
    heightPct: number;
  } | null>(null);

  private player: SyncedGestureController | null = null;
  private runId = 0;
  private lastPlayKey = '';

  constructor() {
    effect(() => {
      const beat = this.beat();
      const enabled = this.enabled();
      const steps = this.steps();
      const endBehavior = this.endBehavior();
      const loop = this.loop();
      const root = this.stageRoot();
      const stepsKey = steps == null ? 'canon' : `override:${steps.length}`;
      const key = `${beat}|${enabled}|${endBehavior}|${loop}|${stepsKey}|${
        root ? 'root' : 'none'
      }`;
      if (!enabled) {
        this.lastPlayKey = '';
        this.stop();
        return;
      }
      if (!root) {
        return;
      }
      if (key === this.lastPlayKey && this.player) {
        return;
      }
      this.lastPlayKey = key;
      this.stop();
      const id = ++this.runId;
      void this.start(id);
    });

    this.destroyRef.onDestroy(() => this.stop());
  }

  private stop(): void {
    this.player?.cancel();
    this.player = null;
    this.fingerVisible.set(false);
    this.fingerPressed.set(false);
    this.ripple.set(null);
    this.scrollThumb.set(null);
  }

  private async start(id: number): Promise<void> {
    await this.warmIonScroller();
    if (id !== this.runId) {
      return;
    }
    const override = this.steps();
    const beatScript = INTRO_BEAT_SCRIPTS[this.beat()];
    const playSteps = override?.length ? override : beatScript.steps;
    const endBehavior = this.resolveEndBehavior();

    const player = new SyncedGestureController({
      getPointerEl: (): HTMLElement | null =>
        this.host.nativeElement.querySelector(
          '.gesture__touch',
        ) as HTMLElement | null,
      getStageRoot: (): HTMLElement | null => this.stageRoot(),
      getScroller: (): HTMLElement | null => this.findScroller(),
      dispatchDomEvents: false,
      onPointer: ({ x, y, visible, pressed }): void => {
        this.fingerX.set(x);
        this.fingerY.set(y);
        this.fingerVisible.set(visible);
        this.fingerPressed.set(pressed);
      },
      onRipple: (x, y): void => {
        this.ripple.set({ x, y, key: Date.now() });
      },
      onEmit: (action): void => {
        this.action.emit(action);
      },
      onScrollProgress: ({ active, scrollTop, maxScroll }): void => {
        if (!active || maxScroll <= 0) {
          this.scrollThumb.set(null);
          return;
        }
        const track = 72;
        const thumbH = Math.max(
          10,
          Math.min(28, (track * 120) / (maxScroll + 120)),
        );
        const travel = track - thumbH;
        const topPct = 14 + (scrollTop / maxScroll) * travel;
        this.scrollThumb.set({ active: true, topPct, heightPct: thumbH });
      },
    });
    this.player = player;

    if (endBehavior === 'hard-loop') {
      await player.play(playSteps, { loop: true });
      return;
    }

    await player.play(playSteps, { loop: false });
    if (id !== this.runId) {
      return;
    }

    this.completed.emit();

    if (endBehavior === 'emit-complete') {
      return;
    }

    // soft-replay: linger on cheerful final frame, then fade + restart.
    await this.delay(REPLAY_SETTLE_MS);
    if (id !== this.runId) {
      return;
    }
    this.action.emit({ type: 'softRestart' });
    await this.delay(REPLAY_FADE_MS);
    if (id !== this.runId) {
      return;
    }
    // Bump key so the next start is allowed even with same inputs.
    this.lastPlayKey = `${this.lastPlayKey}|replay:${Date.now()}`;
    void this.start(++this.runId);
  }

  private resolveEndBehavior(): IntroGestureEndBehavior {
    const explicit = this.endBehavior();
    if (this.loop() && explicit === 'soft-replay') {
      // Flow stories still pass [loop]="true" — treat as soft-replay.
      return 'soft-replay';
    }
    return explicit;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  private async warmIonScroller(): Promise<void> {
    const ion = this.innermostIon();
    if (ion?.getScrollElement) {
      try {
        await ion.getScrollElement();
      } catch {
        /* findScroller still has shadow fallbacks */
      }
    }
    await this.delay(80);
  }

  private findScroller(): HTMLElement | null {
    const root = this.stageRoot();
    const searchRoot =
      (root.querySelector('.source__layer--in') as HTMLElement | null) ?? root;
    const ions = Array.from(
      searchRoot.querySelectorAll('ion-content'),
    ) as IonContentEl[];

    for (let i = ions.length - 1; i >= 0; i--) {
      const el = this.scrollHostOf(ions[i]);
      if (el && el.scrollHeight > el.clientHeight + 1) {
        return el;
      }
    }

    for (let i = ions.length - 1; i >= 0; i--) {
      const el = this.scrollHostOf(ions[i]);
      if (el) {
        return el;
      }
    }

    return (
      (searchRoot.querySelector('.inner-scroll') as HTMLElement | null) ??
      (searchRoot.querySelector('.main-content') as HTMLElement | null) ??
      (searchRoot.querySelector(
        '.ion-content-scroll-host',
      ) as HTMLElement | null)
    );
  }

  private innermostIon(): IonContentEl | null {
    const root = this.stageRoot();
    const searchRoot =
      (root.querySelector('.source__layer--in') as HTMLElement | null) ?? root;
    const ions = searchRoot.querySelectorAll('ion-content');
    return (ions[ions.length - 1] as IonContentEl | undefined) ?? null;
  }

  private scrollHostOf(ion: IonContentEl | null): HTMLElement | null {
    if (!ion) {
      return null;
    }
    const fromShadow = ion.shadowRoot?.querySelector(
      '.inner-scroll',
    ) as HTMLElement | null;
    if (fromShadow) {
      return fromShadow;
    }
    if (ion.scrollEl) {
      return ion.scrollEl;
    }
    return null;
  }
}
