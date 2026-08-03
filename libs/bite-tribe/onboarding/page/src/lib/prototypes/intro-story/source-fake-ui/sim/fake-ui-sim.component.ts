import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { IntroStorySceneId } from '../../intro-story.model';

/**
 * Track 2 PREVIEW — faithful fake BiteTribe UI with simulated motion.
 * Mirrors what Remotion React compositions author for video export
 * (`tools/intro-story-remotion`). Not real Angular feature pages.
 */
@Component({
  selector: 'intro-fake-ui-sim',
  templateUrl: './fake-ui-sim.component.html',
  styleUrl: './fake-ui-sim.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FakeUiSimComponent implements AfterViewInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);

  beat = input.required<IntroStorySceneId>();

  readonly feedScroll = viewChild<ElementRef<HTMLElement>>('feedScroll');
  readonly pulse = signal(0);

  private raf = 0;
  private start = 0;

  ngAfterViewInit(): void {
    this.start = performance.now();
    const tick = (now: number): void => {
      const t = (now - this.start) / 1000;
      this.pulse.set(t);
      const el = this.feedScroll()?.nativeElement;
      if (el && this.beat() === 'discover') {
        el.scrollTop = (Math.sin(t * 0.7) * 0.5 + 0.5) * 120;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    this.destroyRef.onDestroy(() => this.stop());
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private stop(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }
}
