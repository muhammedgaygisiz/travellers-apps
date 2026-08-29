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
import { PageComponent, PageMenuTarget } from 'common/ui/page';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import type { Bite, LikeClick } from 'model';
import { RefresherCustomEvent } from '@ionic/angular';
import { getSimilarityScore, normalize } from 'utils';
import { ConnectionStatus } from '@capacitor/network';
import { HomeFeedControlsComponent } from './home-feed-controls/home-feed-controls.component';
import { GpsErrorCardComponent } from './gps-error-card/gps-error-card.component';
import { FeedErrorCardComponent } from './feed-error-card/feed-error-card.component';
import { NetworkErrorBoxComponent } from './network-error-box/network-error-box.component';
import { BiteListComponent } from './bite-list/bite-list.component';
import { TranslocoPipe } from '@jsverse/transloco';
import type { LocationPermissionState } from 'geolocation';

const PAGE_SIZE = 50;
const MIN_SKELETON_VISIBLE_MS = 2000;

@Component({
  selector: 'bt-home',
  templateUrl: 'home.component.html',
  styleUrl: 'home.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonText,
    IonIcon,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSpinner,
    HomeFeedControlsComponent,
    GpsErrorCardComponent,
    FeedErrorCardComponent,
    NetworkErrorBoxComponent,
    BiteListComponent,
    TranslocoPipe,
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
  hasErrorLoadingBites = input(false, { transform: booleanAttribute });
  locationPermissionState = input<LocationPermissionState | undefined>();
  showFilters = input(true, { transform: booleanAttribute });
  showSearchChip = input(false, { transform: booleanAttribute });
  showSearch = input(false, { transform: booleanAttribute });
  enableTriedOutSwipe = input(false, { transform: booleanAttribute });
  triedOutBiteIds = input<string[]>([]);
  showEmailVerificationPrompt = input(false, { transform: booleanAttribute });
  emailVerificationResendRunning = input(false, {
    transform: booleanAttribute,
  });
  enableImageRetry = input(false, { transform: booleanAttribute });
  /**
   * Forwarded to the bite list so a page that shows the user's own Bites can
   * replace the shared feed's "be the first one" invitation. See issue #1417.
   */
  emptyMessageKey = input('no-bites-found-be-the-first');

  /**
   * Locks the add button behind a spinner while the Create Bite page is still
   * opening, and runs the header bar with it. See GitHub issue #1287.
   */
  createBitePending = input(false, { transform: booleanAttribute });

  readonly logoutClick = output();
  readonly addButtonClick = output();
  readonly menuNavigate = output<PageMenuTarget>();
  readonly gotoSearch = output();
  readonly likeButtonClick = output<LikeClick>();
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
  readonly enableLocation = output<void>();
  readonly triedOutChange = output<{ biteId: string; checked: boolean }>();
  readonly resendEmailVerification = output<void>();
  readonly retryImageUpload = output<Bite>();

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

  /**
   * The skeleton stands in for the feed, so it may only run while there is no
   * feed to show. Once bites are on screen a resynchronization reports itself
   * through the header progress bar and leaves them readable and navigable —
   * a reconnect used to hide everything the user already had behind a skeleton
   * for as long as the load took (issue #1230).
   */
  showBiteListSkeleton = computed(
    () => this.showBiteSkeleton() && (this.bites()?.length ?? 0) === 0,
  );

  moreThen5Bites = computed(() => {
    const bites = this.bites();
    return bites && bites?.length > 5;
  });

  scrollToTop(): void {
    const ionContent = this.ionContent();

    if (ionContent) {
      ionContent.scrollToTop(300);
    }
  }

  toggleSearch(): void {
    this.isSearchVisible.update((visible) => !visible);
    if (!this.isSearchVisible()) {
      this.searchTerm.set('');
    }
  }

  /**
   * Drops the search term but keeps the searchbar open, so the empty result can
   * offer its way out without the user having to reopen the search to type the
   * next term. See GitHub issue #1331.
   */
  clearSearch(): void {
    this.searchTerm.set('');
    this.currentPage.set(1);
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

  onLoadMore(): void {
    if (this.hasMore()) {
      this.currentPage.update((curr) => curr + 1);
    }
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
