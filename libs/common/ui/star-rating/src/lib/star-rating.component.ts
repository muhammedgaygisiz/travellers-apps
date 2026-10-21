import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { IonIcon, IonLabel } from '@ionic/angular/standalone';
import { IsFilledPipe } from './pipes/is-filled.pipe';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HapticsService } from 'haptics';

@Component({
  selector: 'star-rating',
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IsFilledPipe, IonLabel],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StarRatingComponent),
      multi: true,
    },
  ],
})
export class StarRatingComponent implements ControlValueAccessor {
  private readonly haptics = inject(HapticsService);
  rating = input<number | undefined>(0);

  readonly = input(false, { transform: booleanAttribute });

  label = input<string | null>(null);

  rated = output<number>();

  hoveredIndex = signal(-1);

  /**
   * The star that just became the selected one, which pops on the same frame
   * as its `tick`. Cleared when its animation ends.
   */
  poppedStar = signal(0);

  protected readonly stars = [1, 2, 3, 4, 5];

  /** The pointer dragging across the stars, while one is. */
  private activePointer: number | null = null;

  /** The value the stars show while a finger is on them. */
  private dragValue = 0;

  /**
   * A drag commits on `pointerup`, and the browser then fires `click` for the
   * same tap. This swallows that one click so the rating is not committed
   * twice.
   */
  private suppressClick = false;

  getRating = computed(() => {
    const value = this.value();

    if (value) {
      return value;
    }

    const rating = this.rating();

    return rating ? rating : 0;
  });

  /** A rating chosen in one go: a click, or the keyboard. */
  onRate(rating: number): void {
    if (this.readonly()) {
      return;
    }

    if (rating !== this.getRating()) {
      this.stepped(rating);
    }

    this.commit(rating);
  }

  onStarClick(rating: number): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }

    this.onRate(rating);
  }

  /**
   * A finger, pen or mouse going down on the stars starts a drag: the stars
   * follow it and commit when it lifts. `touch-action: pan-y` keeps a
   * horizontal drag from being taken as a scroll, and pointer capture keeps
   * the drag alive when it strays off the row.
   */
  onPointerDown(event: PointerEvent): void {
    if (this.readonly() || !event.isPrimary || event.button > 0) {
      return;
    }

    const row = event.currentTarget as HTMLElement;
    this.activePointer = event.pointerId;
    this.suppressClick = false;
    this.dragValue = this.getRating();
    row.setPointerCapture?.(event.pointerId);

    this.dragTo(starAt(row, event.clientX));
  }

  onPointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.activePointer) {
      return;
    }

    this.dragTo(starAt(event.currentTarget as HTMLElement, event.clientX));
  }

  onPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.activePointer) {
      return;
    }

    this.activePointer = null;
    this.hoveredIndex.set(-1);
    this.suppressClick = true;
    this.commit(this.dragValue);
  }

  /** A drag the browser took over commits nothing. */
  onPointerCancel(event: PointerEvent): void {
    if (event.pointerId !== this.activePointer) {
      return;
    }

    this.activePointer = null;
    this.hoveredIndex.set(-1);
  }

  onPopEnd(star: number): void {
    if (this.poppedStar() === star) {
      this.poppedStar.set(0);
    }
  }

  /**
   * Plays `tick` and pops the star, once per change of the value the stars
   * show - never per `pointermove` inside the same star (issue #1748).
   */
  private dragTo(star: number): void {
    if (star === this.dragValue) {
      return;
    }

    this.dragValue = star;
    this.hoveredIndex.set(star);
    this.stepped(star);
  }

  private stepped(star: number): void {
    this.poppedStar.set(star);
    void this.haptics.tick();
  }

  private commit(rating: number): void {
    this.rated.emit(rating);
    this.setValueAndTriggerChange(rating);
  }

  setValueAndTriggerChange(rating: number): void {
    this.writeValue(rating);
    this._onChange(rating);
    this._onTouch();
  }

  onHover(index: number): void {
    if (!this.readonly()) this.hoveredIndex.set(index);
  }

  onLeave(): void {
    this.hoveredIndex.set(-1);
  }

  value = signal<number | null>(null);

  writeValue(obj: number | null): void {
    this.value.set(obj);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  _onChange: (value: number | null) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  _onTouch: () => void = () => {};

  registerOnChange(fn: (value: number | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouch = fn;
  }
}

/**
 * The star under a horizontal position: how many stars start at or before it,
 * so the gap between two stars belongs to the one on its left. A drag past
 * either end holds the first or the last star rather than leaving the row.
 */
const starAt = (row: HTMLElement, clientX: number): number => {
  const icons = Array.from(row.querySelectorAll('ion-icon'));
  const reached = icons.filter(
    (icon) => icon.getBoundingClientRect().left <= clientX,
  ).length;

  return Math.min(Math.max(reached, 1), icons.length);
};
