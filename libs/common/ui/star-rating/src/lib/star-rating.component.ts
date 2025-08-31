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
import { IonIcon } from '@ionic/angular/standalone';
import { IsFilledPipe } from './pipes/is-filled.pipe';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'star-rating',
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IsFilledPipe],
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

  readOnly = input(false, { transform: booleanAttribute });

  rated = output<number>();

  hoveredIndex = signal(-1);

  getRating = computed(() => {
    const value = this.value();

    if (value) {
      return value;
    }

    const rating = this.rating();

    return rating ? rating : 0;
  });

  onRate(rating: number): void {
    if (this.readOnly()) {
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
    if (!this.readOnly()) this.hoveredIndex.set(index);
  }

  onLeave(): void {
    this.hoveredIndex.set(-1);
  }

  value = signal<number | null>(null);

  writeValue(obj: any): void {
    this.value.set(obj);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  _onChange: (value: number | null) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  _onTouch: () => void = () => {};

  registerOnChange(fn: any): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this._onTouch = fn;
  }
}
