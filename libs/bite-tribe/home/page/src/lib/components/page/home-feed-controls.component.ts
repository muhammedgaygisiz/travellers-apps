import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  IonBadge,
  IonChip,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'bt-home-feed-controls',
  templateUrl: 'home-feed-controls.component.html',
  styleUrl: 'home-feed-controls.component.scss',
  imports: [
    IonBadge,
    IonChip,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonText,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeFeedControlsComponent {
  showFilters = input(true);
  hasActiveFilters = input(false);
  numberOfFilters = input(0);
  showSearchChip = input(false);
  showMap = input(true);
  sorting = input<string>('distance');
  sortingLabel = input('Distance');

  readonly gotoSearch = output<void>();
  readonly openMapView = output<void>();
  readonly sortingChange = output<string>();

  emitSortingChange(event: { detail?: { value: string } }): void {
    if (event.detail) {
      this.sortingChange.emit(event.detail.value);
    }
  }
}
