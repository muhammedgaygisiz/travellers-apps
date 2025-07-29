import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonIcon,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import { Bite } from 'model';
import { BiteComponent } from 'bite-tribe-common/bite';
import { NgTemplateOutlet } from '@angular/common';
import { TypeaheadComponent } from '../type-ahead/type-ahead.component';

@Component({
  selector: 'bt-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonChip,
    BiteComponent,
    IonCard,
    IonCardContent,
    IonText,
    IonSpinner,
    NgTemplateOutlet,
    IonIcon,
    IonButton,
    IonSelect,
    IonSelectOption,
    IonModal,
    TypeaheadComponent,
    IonBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteTribeHomeComponent {
  bites = input<any[]>();
  allTags = input<string[]>([]);
  selectedFilters = input<string[]>([]);
  enableBackButton = input<boolean>(false);
  userId = input<string>();
  title = input('Bites');
  editableBites = input(false, { transform: booleanAttribute });
  showFooter = input(true);
  isAuthenticated = input(false);
  showAddButton = input(true);
  showHeaderMenu = input(true);
  showSpinner = input<boolean>(false);
  isBitesLoading = input<boolean | undefined>();
  sorting = input<string>('distance');
  distance = input<number>();

  readonly logoutClick = output();
  readonly addButtonClick = output();
  readonly gotoSettings = output();
  readonly gotoMyBites = output();
  readonly gotoMyBucketlists = output();
  readonly likeButtonClick = output<{ likeType: string; biteId: string }>();
  readonly biteClick = output<Bite>();
  readonly restaurantClick = output<Bite>();
  readonly gotoEdit = output<Bite>();
  readonly deleteBite = output<Bite>();
  readonly openMapView = output();
  readonly filtersApplied = output<string[]>();
  readonly filtersCleared = output<void>();
  readonly filterRemoved = output<string>();
  readonly nearbyFilter = output<number>();
  readonly sortingChange = output<string>();
  readonly clearNearbyFilter = output<void>();

  ionContent = viewChild(IonContent);

  // Bites are already filtered by the store, just pass through
  filteredBites = computed(() => this.bites() || []);

  moreThen5Bites = computed(() => {
    const bites = this.bites();
    return bites && bites?.length > 5;
  });

  sortingLabel = computed(() => {
    const sorting = this.sorting();
    switch (sorting) {
      case 'distance':
        return 'Distance';
      case 'likes':
        return 'Likes';
      case 'createdAt':
        return 'Creation date';
      case 'price':
        return 'Price';
      default:
        return 'Distance';
    }
  });

  numberOfFilters = computed(() => {
    const selectedFilters = this.selectedFilters();
    const distance = this.distance();

    return selectedFilters.length + (distance ? 1 : 0);
  });

  tagsSelectionChanged(tagsSelection: string[] | undefined, modal: IonModal) {
    modal.dismiss();

    if (tagsSelection) {
      this.filtersApplied.emit(tagsSelection);
    }
  }

  distanceChanged(distance: string, modal: IonModal) {
    modal.dismiss();

    if (distance) {
      this.nearbyFilter.emit(+distance);
      return;
    }

    this.clearNearbyFilter.emit();
  }

  removeFilter(filter: string) {
    this.filterRemoved.emit(filter);
  }

  scrollToTop() {
    const ionContent = this.ionContent();

    if (ionContent) {
      ionContent.scrollToTop(300);
    }
  }

  emitSortingChange(event: { detail: { value: string } }) {
    if (event.detail) {
      this.sortingChange.emit(event.detail.value);
    }
  }
}
