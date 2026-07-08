import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  IonBadge,
  IonChip,
  IonIcon,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonText,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { TypeaheadComponent } from '../../type-ahead/type-ahead.component';

@Component({
  selector: 'bt-home-feed-controls',
  templateUrl: 'home-feed-controls.component.html',
  styleUrl: 'home-feed-controls.component.scss',
  imports: [
    IonBadge,
    IonChip,
    IonIcon,
    IonModal,
    IonSelect,
    IonSelectOption,
    IonText,
    TranslocoPipe,
    TypeaheadComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeFeedControlsComponent {
  showFilters = input(true);
  selectedFilters = input<string[]>([]);
  distance = input<number | undefined>();
  maxPriceFilter = input(0);
  showSearchChip = input(false);
  showMap = input(true);
  sorting = input<string>('distance');
  allTags = input<string[]>([]);
  preferedCurrency = input('EUR');

  readonly gotoSearch = output<void>();
  readonly openMapView = output<void>();
  readonly sortingChange = output<string>();
  readonly filtersChanged = output<{
    tagFilters: string[];
    distanceFilter: string;
    priceFilter: number;
  }>();
  readonly filterCleared = output<void>();

  sortingLabelKey = computed(() => {
    switch (this.sorting()) {
      case 'distance':
        return 'distance';
      case 'likes':
        return 'likes';
      case 'createdAt':
        return 'date';
      case 'price':
        return 'price';
      case 'rating':
        return 'rating';
      default:
        return 'distance';
    }
  });

  numberOfFilters = computed(() => {
    const selectedFilters = this.selectedFilters();
    const distance = this.distance();
    const priceFilter = this.maxPriceFilter();

    return (
      selectedFilters.length + (distance ? 1 : 0) + (priceFilter > 0 ? 1 : 0)
    );
  });

  hasActiveFilters = computed(() => this.numberOfFilters() > 0);

  emitSortingChange(event: { detail?: { value: string } }): void {
    if (event.detail) {
      this.sortingChange.emit(event.detail.value);
    }
  }

  onFilterChange(
    filterSelection: {
      tagFilters: string[];
      distanceFilter: string;
      priceFilter: number;
    },
    modal: IonModal,
  ): void {
    modal.dismiss();

    if (filterSelection) {
      this.filtersChanged.emit(filterSelection);
    }
  }

  onFiltersClear(modal: IonModal): void {
    modal.dismiss();
    this.filterCleared.emit();
  }
}
