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
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonModal,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonText,
} from '@ionic/angular/standalone';
import type { Bite, Like } from 'model';
import {
  BiteComponent,
  BiteSkeletonListComponent,
} from 'bite-tribe-common/bite';
import { NgTemplateOutlet } from '@angular/common';
import { TypeaheadComponent } from '../type-ahead/type-ahead.component';
import {
  InfiniteScrollCustomEvent,
  RefresherCustomEvent,
} from '@ionic/angular';
import { getSimilarityScore, normalize } from 'utils';
import { ConnectionStatus } from '@capacitor/network';
import { TranslocoPipe } from '@jsverse/transloco';
import { IsBiteTriedOutPipe } from './is-bite-tried-out.pipe';
import { HomeFeedControlsComponent } from './home-feed-controls/home-feed-controls.component';
import { GpsErrorCardComponent } from './gps-error-card/gps-error-card.component';
import { NetworkErrorBoxComponent } from './network-error-box/network-error-box.component';

const PAGE_SIZE = 50;
const MIN_SKELETON_VISIBLE_MS = 2000;

@Component({
  selector: 'bt-home',
  templateUrl: 'home.component.html',
  styleUrl: 'home.component.scss',
  imports: [
    PageComponent,
    IonContent,
    BiteComponent,
    IonText,
    BiteSkeletonListComponent,
    NgTemplateOutlet,
    IonIcon,
    IonButton,
    IonCheckbox,
    IonButtons,
    IonModal,
    TypeaheadComponent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    TranslocoPipe,
    IsBiteTriedOutPipe,
    HomeFeedControlsComponent,
    GpsErrorCardComponent,
    NetworkErrorBoxComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteTribeHomeComponent {
  bites = input<Bite[]>();
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
  showMap = input(true);
  showSpinner = input<boolean>(false);
  isBitesLoading = input<boolean | undefined>();
  sorting = input<string>('distance');
  distance = input<number>();
  maxPriceFilter = input<number>(0);
  preferedCurrency = input('EUR');
  isReloading = input(false, { transform: booleanAttribute });
  hasErrorLoadingGpsPosition = input(false);
  showFilters = input(true, { transform: booleanAttribute });
  showSearchChip = input(false, { transform: booleanAttribute });
  showSearch = input(false, { transform: booleanAttribute });
  showTriedOutCheckbox = input(false, { transform: booleanAttribute });
  triedOutBiteIds = input<string[]>([]);

  readonly logoutClick = output();
  readonly addButtonClick = output();
  readonly gotoSettings = output();
  readonly gotoMyProfile = output();
  readonly gotoMyBites = output();
  readonly gotoAbout = output();
  readonly gotoMarketPlace = output();
  readonly gotoGallery = output();
  readonly gotoLeaderboard = output();
  readonly gotoMyBucketlists = output();
  readonly gotoSearch = output();
  readonly likeButtonClick = output<Like>();
  readonly biteClick = output<Bite>();
  readonly gotoEdit = output<Bite>();
  readonly deleteBite = output<Bite>();
  readonly rateNowClick = output<{ bite: Bite; rating: number }>();
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
  readonly triedOutChange = output<{ biteId: string; checked: boolean }>();

  ionContent = viewChild(IonContent);

  currentPage = signal<number>(1);

  isSearchVisible = signal(false);
  searchTerm = signal('');
  showBiteSkeleton = signal(false);
  private skeletonShownAt = 0;
  private hideSkeletonTimeout: ReturnType<typeof setTimeout> | undefined;

  refreshEvent: RefresherCustomEvent | null = null;
  syncBiteSkeleton = effect((onCleanup) => {
    const shouldShowSkeleton =
      this.showSpinner() && (this.isBitesLoading() || this.isReloading());

    clearTimeout(this.hideSkeletonTimeout);

    if (shouldShowSkeleton) {
      this.skeletonShownAt = Date.now();
      this.showBiteSkeleton.set(true);
      return;
    }

    if (!this.showBiteSkeleton()) {
      return;
    }

    const elapsed = Date.now() - this.skeletonShownAt;
    const remaining = Math.max(MIN_SKELETON_VISIBLE_MS - elapsed, 0);

    this.hideSkeletonTimeout = setTimeout(() => {
      this.showBiteSkeleton.set(false);
    }, remaining);

    onCleanup(() => {
      clearTimeout(this.hideSkeletonTimeout);
    });
  });

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

  onFiltersClear(modal: IonModal): void {
    modal.dismiss();
    this.filterCleared.emit();
  }

  toggleSearch(): void {
    this.isSearchVisible.update((visible) => !visible);
    if (!this.isSearchVisible()) {
      this.searchTerm.set('');
    }
  }

  onSearchInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.searchTerm.set(inputElement.value ?? '');
    this.currentPage.set(1);
  }

  filteredBites = computed(() => {
    const allBites = this.bites() || [];
    const rawTerm = this.searchTerm();

    if (!rawTerm) {
      return allBites;
    }

    const term = normalize(rawTerm);

    return allBites.filter((bite) => {
      const name = normalize(bite.name);
      const foundInName =
        name.includes(term) || getSimilarityScore(term, name).length > 0;

      const restoName = normalize(bite.place);
      const foundInRestoName =
        restoName.includes(term) ||
        getSimilarityScore(term, restoName).length > 0;

      return foundInName || foundInRestoName;
    });
  });

  displayedBites = computed(() => {
    const allBites = this.filteredBites();
    const page = this.currentPage();
    const startIndex = 0;
    const endIndex = page * PAGE_SIZE;

    return allBites.slice(startIndex, endIndex);
  });

  hasMore = computed(() => {
    const allBites = this.filteredBites();
    const page = this.currentPage();

    return allBites.length > page * PAGE_SIZE;
  });

  networkStatus = input<ConnectionStatus | undefined>();

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

  onTriedOutChange(
    event: { detail: { checked: boolean } },
    biteId: string,
  ): void {
    this.triedOutChange.emit({ biteId, checked: event.detail.checked });
  }
}
