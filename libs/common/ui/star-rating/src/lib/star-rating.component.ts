import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { IonIcon, IonLabel } from '@ionic/angular/standalone';
import { IsFilledPipe } from './pipes/is-filled.pipe';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

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
  rating = input<number | undefined>(0);

  readonly = input(false, { transform: booleanAttribute });

  label = input<string | null>(null);

  rated = output<number>();

  hoveredIndex = signal(-1);

  protected readonly stars = [1, 2, 3, 4, 5];

  getRating = computed(() => {
    const value = this.value();

    if (value) {
      return value;
    }

    const rating = this.rating();

    return rating ? rating : 0;
  });

  onRate(rating: number): void {
    if (this.readonly()) {
      return;
    }

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
