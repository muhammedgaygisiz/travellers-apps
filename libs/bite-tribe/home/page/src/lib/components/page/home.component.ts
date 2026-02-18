import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
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
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonModal,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import type { Bite, Like } from 'model';
import { BiteComponent } from 'bite-tribe-common/bite';
import { NgTemplateOutlet } from '@angular/common';
import { TypeaheadComponent } from '../type-ahead/type-ahead.component';
import {
  InfiniteScrollCustomEvent,
  RefresherCustomEvent,
} from '@ionic/angular';

const PAGE_SIZE = 50;

@Component({
  selector: 'bt-home',
  templateUrl: 'home.component.html',
  styleUrl: 'home.component.scss',
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
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonRefresher,
    IonRefresherContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteTribeHomeComponent {
  bites = input<Bite[]>();
  uploads = input<Record<string, any>>({});
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
  maxPriceFilter = input<number>(0);
  preferedCurrency = input('EUR');
  isReloading = input(false, { transform: booleanAttribute });
  hasErrorLoadingGpsPosition = input(false);

  readonly logoutClick = output();
  readonly addButtonClick = output();
  readonly gotoSettings = output();
  readonly gotoMyProfile = output();
  readonly gotoMyBites = output();
  readonly gotoAbout = output();
  readonly gotoMyBucketlists = output();
  readonly likeButtonClick = output<Like>();
  readonly biteClick = output<Bite>();
  readonly restaurantClick = output<Bite>();
  readonly gotoEdit = output<Bite>();
  readonly deleteBite = output<Bite>();
  readonly openMapView = output();
  readonly filtersChanged = output<{
    tagFilters: string[];
    distanceFilter: string;
    priceFilter: number;
  }>();
  readonly sortingChange = output<string>();
  readonly filterCleared = output<void>();
  readonly refresh = output<void>();
  readonly closeGpsError = output<void>();

  ionContent = viewChild(IonContent);

  currentPage = signal<number>(1);

  refreshEvent: RefresherCustomEvent | null = null;
  onRefresh = effect(() => {
    const isReloading = this.isReloading();

    if (!isReloading) {
      setTimeout(() => {
        this.refreshEvent?.target.complete();
      }, 2000);
    }
  });

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
        return 'Date';
      case 'price':
        return 'Price';
      default:
        return 'Distance';
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

  scrollToTop(): void {
    const ionContent = this.ionContent();

    if (ionContent) {
      ionContent.scrollToTop(300);
    }
  }

  emitSortingChange(event: { detail: { value: string } }): void {
    if (event.detail) {
      this.sortingChange.emit(event.detail.value);
    }
  }

  onFiltersClear(modal: IonModal): void {
    modal.dismiss();
    this.filterCleared.emit();
  }

  displayedBites = computed(() => {
    const allBites = this.bites() || [];
    const page = this.currentPage();
    const startIndex = 0;
    const endIndex = page * PAGE_SIZE;

    return allBites.slice(startIndex, endIndex);
  });

  hasMore = computed(() => {
    const allBites = this.bites() || [];
    const page = this.currentPage();

    return allBites.length > page * PAGE_SIZE;
  });

  onIonInfinite(event: InfiniteScrollCustomEvent): void {
    if (this.hasMore()) {
      this.currentPage.update((curr) => curr + 1);
    }

    event.target.complete();
  }

  refreshBites(event: RefresherCustomEvent): void {
    this.refreshEvent = event;
    this.refresh.emit();

    setTimeout(() => {
      const reloading = this.isReloading();

      if (!reloading) {
        event.target.complete();
      }
    }, 2000);
  }
}
