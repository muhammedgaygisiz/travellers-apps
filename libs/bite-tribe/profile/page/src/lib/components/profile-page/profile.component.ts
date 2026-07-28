import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent, PageMenuTarget } from 'common/ui/page';
import {
  IonAlert,
  IonBadge,
  IonButton,
  IonContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/angular/standalone';
import { Bite, BiteTrail, LikeClick, ProfileMetaData, PublicUser } from 'model';

import { BiteComponent } from 'bite-tribe-common/bite';
import { OverlayEventDetail } from '@ionic/core';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import { BiteTrailComponent } from 'bite-trail';
import { ProfileHeader } from './components/profile-header';
import { CountryFlags } from './components/country-flags';
import { ProfileSkeleton } from './components/profile-skeleton';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

const UNFOLLOW = 'unfollow';
const CANCEL = 'cancel';

const PAGE_SIZE = 50;

@Component({
  selector: 'profile-page',
  templateUrl: 'profile.component.html',
  styleUrl: 'profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonButton,
    BiteComponent,
    IonBadge,
    IonAlert,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    BiteTrailComponent,
    ProfileHeader,
    CountryFlags,
    ProfileSkeleton,
    TranslocoPipe,
  ],
})
export class ProfileComponent {
  transloco = inject(TranslocoService);

  isAuthenticated = input(false);
  isLoading = input(false, { transform: booleanAttribute });
  user = input<PublicUser | undefined>();
  bites = input<Bite[]>();
  profileMetadata = input<ProfileMetaData>();
  userId = input<string>();
  subscriptionTier = computed((): number => {
    return this.user()?.subscriptionTier || 0;
  });
  displayName = computed((): string => {
    return (
      this.user()?.displayName || this.transloco.translate('no-display-name')
    );
  });
  emptyBitesMessage = computed((): string => {
    return this.transloco.translate(
      this.user()?.isOrganisation ? 'no-bite-trails-yet' : 'no-bites-yet',
    );
  });
  city = computed((): string => {
    return this.user()?.city || this.transloco.translate('no-location');
  });
  biteTrails = input<BiteTrail[]>();
  enableImageRetry = input(false, { transform: booleanAttribute });

  readonly logoutClick = output();
  readonly menuNavigate = output<PageMenuTarget>();
  readonly gotoEditProfile = output();

  readonly biteClick = output<Bite>();
  readonly likeButtonClick = output<LikeClick>();
  readonly followButtonClick = output<PublicUser>();
  readonly unfollowButtonClick = output<PublicUser>();
  readonly followersClick = output<string>();
  readonly followingClick = output<string>();
  readonly retryImageUpload = output<Bite>();

  isOpen = signal(false);
  currentPage = signal<number>(1);

  // Only skeletonize while there is nothing to show. A reload of an already
  // rendered profile keeps the current content in place.
  showSkeleton = computed((): boolean => {
    return this.isLoading() && !this.user();
  });

  confirmationButtons = [
    {
      text: this.transloco.translate('cancel'),
      role: CANCEL,
    },
    {
      text: this.transloco.translate('yes-unfollow'),
      role: UNFOLLOW,
    },
  ];

  followerCount = computed(() => {
    return this.profileMetadata()?.followers;
  });

  followingCount = computed(() => {
    return this.profileMetadata()?.following;
  });

  biteCount = computed(() => {
    // Prefer the aggregate stored on the user document over counting the
    // client-side loaded bites, which only reflects the paginated subset.
    const aggregateBiteCount = this.user()?.biteCount;
    if (typeof aggregateBiteCount === 'number') {
      return aggregateBiteCount;
    }

    const bites = this.bites();

    return bites ? bites.length : 0;
  });

  biteTrailCount = computed(() => {
    const biteTrails = this.biteTrails();

    return biteTrails ? biteTrails.length : 0;
  });

  displayedBites = computed(() => {
    const allBites = this.bites() || [];
    const page = this.currentPage();
    const startIndex = 0;
    const endIndex = page * PAGE_SIZE;

    return allBites.slice(startIndex, endIndex);
  });

  displayedBiteTrails = computed(() => {
    const allBiteTrails = this.biteTrails() || [];
    const page = this.currentPage();
    const startIndex = 0;
    const endIndex = page * PAGE_SIZE;

    return allBiteTrails.slice(startIndex, endIndex);
  });

  isUnfollowedUser = computed((): boolean => {
    const currentUserId = this.userId();
    const profileOwner = this.user()?.userId;

    if (!profileOwner) {
      return false;
    }

    return currentUserId !== profileOwner;
  });

  onFollow(): void {
    const user = this.user();
    if (user) {
      this.followButtonClick.emit(user);
    }
  }

  unfollow(): void {
    const user = this.user();
    if (user) {
      this.unfollowButtonClick.emit(user);
    }
  }

  openConfirmationDialog(): void {
    this.isOpen.set(true);
  }

  handleConfirmationDismiss(event: CustomEvent<OverlayEventDetail>): void {
    const role = event.detail.role;

    if (role === UNFOLLOW) {
      this.unfollow();
    }

    this.isOpen.set(false);
  }

  onIonInfinite(event: InfiniteScrollCustomEvent): void {
    this.currentPage.update((curr) => curr + 1);
    event.target.complete();
  }
}
