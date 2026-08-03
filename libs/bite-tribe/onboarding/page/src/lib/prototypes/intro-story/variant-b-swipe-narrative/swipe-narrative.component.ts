import {
  ChangeDetectionStrategy,
  Component,
  computed,
  output,
  signal,
} from '@angular/core';
import { INTRO_STORY_SCENES } from '../intro-story.model';
import { RealUiSourceComponent } from '../source-real-ui/real-ui-source.component';

/**
 * C — Swipe / Continue chrome around a scaled real-UI showcase (non-interactive).
 */
@Component({
  selector: 'intro-swipe-narrative',
  templateUrl: './swipe-narrative.component.html',
  styleUrl: './swipe-narrative.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RealUiSourceComponent],
})
export class SwipeNarrativeComponent {
  completed = output<void>();
  skipped = output<void>();

  readonly scenes = INTRO_STORY_SCENES;
  readonly index = signal(0);
  readonly dragX = signal(0);
  readonly dragging = signal(false);

  readonly isLast = computed(() => this.index() >= this.scenes.length - 1);
  readonly progressLabel = computed(
    () => `${this.index() + 1} of ${this.scenes.length}`,
  );
  readonly scene = computed(() => this.scenes[this.index()]);

  private startX = 0;
  private startY = 0;
  private axis: 'x' | 'y' | null = null;

  onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.axis = null;
    this.dragging.set(true);
    this.dragX.set(0);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging()) {
      return;
    }
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    if (!this.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        return;
      }
      this.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    }
    if (this.axis !== 'x') {
      return;
    }
    this.dragX.set(dx);
  }

  onPointerUp(): void {
    if (!this.dragging()) {
      return;
    }
    const dx = this.dragX();
    this.dragging.set(false);
    this.dragX.set(0);
    this.axis = null;

    if (dx <= -64) {
      this.next();
      return;
    }
    if (dx >= 64) {
      this.prev();
    }
  }

  goTo(i: number): void {
    if (i < 0 || i >= this.scenes.length) {
      return;
    }
    this.index.set(i);
  }

  next(): void {
    if (this.isLast()) {
      this.completed.emit();
      return;
    }
    this.index.update((i) => i + 1);
  }

  prev(): void {
    if (this.index() === 0) {
      return;
    }
    this.index.update((i) => i - 1);
  }

  skip(): void {
    this.skipped.emit();
  }

  finish(): void {
    this.completed.emit();
  }
}
