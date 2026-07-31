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
  type GestureEmit,
  type GestureScriptStep,
} from '../gesture';

export type IntroStageAction = GestureEmit;

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
  loop = input(true);

  action = output<IntroStageAction>();

  readonly fingerVisible = signal(false);
  readonly fingerX = signal(50);
  readonly fingerY = signal(70);
  readonly fingerPressed = signal(false);
  readonly ripple = signal<{ x: number; y: number; key: number } | null>(null);
  /** iOS-style scroll thumb — driven by SyncedGestureController. */
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
      const loop = this.loop();
      const root = this.stageRoot();
      // Key on meaning, not stageRoot identity — parent CD after navigate
      // must not cancel the player mid-script.
      const stepsKey = steps == null ? 'canon' : `override:${steps.length}`;
      const key = `${beat}|${enabled}|${loop}|${stepsKey}|${root ? 'root' : 'none'}`;
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
    const playLoop = override?.length ? this.loop() : beatScript.loop;
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
        const track = 72; // usable track % of screen height
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
    await player.play(playSteps, { loop: playLoop });
    if (id !== this.runId) {
      return;
    }
  }

  /** Force Ionic to materialize the innermost scroll host before play. */
  private async warmIonScroller(): Promise<void> {
    const ion = this.innermostIon();
    if (ion?.getScrollElement) {
      try {
        await ion.getScrollElement();
      } catch {
        /* findScroller still has shadow fallbacks */
      }
    }
    // Brief settle so scrollHeight > clientHeight is measurable.
    await new Promise<void>((r) => window.setTimeout(r, 80));
  }

  /**
   * INNERMOST ion-content `.inner-scroll` that can actually scroll.
   * Outer ta-page / shell ion-content often has scrollHeight === clientHeight
   * and must NOT be used — that breaks synced scroll.
   */
  private findScroller(): HTMLElement | null {
    const root = this.stageRoot();
    const searchRoot =
      (root.querySelector('.source__layer--in') as HTMLElement | null) ?? root;
    const ions = Array.from(
      searchRoot.querySelectorAll('ion-content'),
    ) as IonContentEl[];

    // Innermost → outermost: pick first that is actually scrollable.
    for (let i = ions.length - 1; i >= 0; i--) {
      const el = this.scrollHostOf(ions[i]);
      if (el && el.scrollHeight > el.clientHeight + 1) {
        return el;
      }
    }

    // Fallback: innermost host even if layout not measured yet.
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
