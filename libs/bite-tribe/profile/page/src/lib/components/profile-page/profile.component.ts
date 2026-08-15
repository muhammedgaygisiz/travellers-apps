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
import { ProfileVisibility } from './components/profile-visibility';
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
    ProfileVisibility,
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
  /**
   * The real name, shown only when it says something the heading does not.
   *
   * Onboarding used to copy the display name into `fullName`, so every account
   * created through it carries the duplicate permanently and read its own name
   * twice. The write is fixed at the source, but accounts created before that
   * can only be repaired here — a stored value equal to the display name is
   * treated as the absence of a real name rather than as a second one. See
   * GitHub issue #1270.
   */
  readonly metaName = computed((): string => {
    const user = this.user();
    const fullName = user?.fullName?.trim() || '';
    const displayName = user?.displayName?.trim() || '';

    return fullName.toLocaleLowerCase() === displayName.toLocaleLowerCase()
      ? ''
      : fullName;
  });

  /**
   * The line under the display name, empty when it has nothing to carry.
   *
   * A profile with no city used to advertise "No location" for something the
   * app never asked the user for, which reads as data that went missing rather
   * than as an optional field nobody filled in. Onboarding collects no city at
   * all today, which is tracked separately in issue #1271.
   */
  readonly profileMeta = computed((): string => {
    const city = this.user()?.city?.trim() || '';

    return [this.metaName(), city].filter(Boolean).join(', ');
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
    // The aggregate stored on the user document leads, because it is the only
    // count that also covers Bites the client never loaded, and counting the
    // loaded ones alone would report a paginated subset.
    //
    // It does not get the last word, though. The client's copy of the user
    // document can predate a write the user made themselves, and the aggregate
    // being a number in that case too meant the stale value was reported
    // unchallenged: after posting a Bite the header read one less than the list
    // right underneath it, and only an app restart repaired it (issue #1310).
    // A list longer than the aggregate claims is proof the aggregate is behind,
    // whether or not it is the whole list, so it raises the count. A list
    // shorter proves nothing — that is the paginated case.
    const aggregateBiteCount = this.user()?.biteCount;
    const loadedBiteCount = this.bites()?.length ?? 0;

    return typeof aggregateBiteCount === 'number'
      ? Math.max(aggregateBiteCount, loadedBiteCount)
      : loadedBiteCount;
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

  isOwnProfile = computed((): boolean => {
    const currentUserId = this.userId();
    const profileOwner = this.user()?.userId;

    return !!currentUserId && currentUserId === profileOwner;
  });

  // The visibility status is a self-service privacy control, so it only belongs
  // on the signed-in user's own personal profile. Organisation profiles have no
  // visibility switch it could explain or lead to.
  showVisibilityStatus = computed((): boolean => {
    return this.isOwnProfile() && !this.user()?.isOrganisation;
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
