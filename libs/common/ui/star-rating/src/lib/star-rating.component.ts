import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { IsFilledPipe } from './pipes/is-filled.pipe';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'star-rating',
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IsFilledPipe],
})
export class StarRatingComponent {
  rating = input<number | undefined>(0);

  max = input(5);

  readOnly = input(false, { transform: booleanAttribute });

  rated = output<number>();

  hoveredIndex = signal(-1);

  getStars = computed(() => {
    const max = this.max();

    return Array(max)
      .fill(0)
      .map((_, i) => i + 1);
  });

  onRate(rating: number) {
    if (this.readOnly()) {
      return;
    }

    this.rated.emit(rating);
  }

  onHover(index: number) {
    if (!this.readOnly()) this.hoveredIndex.set(index);
  }

  onLeave() {
    this.hoveredIndex.set(-1);
  }
}
