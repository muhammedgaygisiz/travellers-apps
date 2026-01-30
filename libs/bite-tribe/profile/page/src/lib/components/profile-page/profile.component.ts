import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonAlert,
  IonAvatar,
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/angular/standalone';
import { Bite, Like, ProfileMetaData, PublicUser } from 'model';

import { BiteComponent } from 'bite-tribe-common/bite';
import { OverlayEventDetail } from '@ionic/core';
import { InfiniteScrollCustomEvent } from '@ionic/angular';

const BADGE_CONFIG = [
  { min: 50, max: 100, cssClassName: 'green' },
  { min: 100, max: 1000, cssClassName: 'bronze' },
  { min: 1000, max: 10000, cssClassName: 'silver' },
  { min: 10000, max: Infinity, cssClassName: 'gold' },
];

const getBadgeColor = (biteCount: number): string => {
  for (const config of BADGE_CONFIG) {
    if (config.min <= biteCount && biteCount < config.max) {
      return config.cssClassName;
    }
  }

  return '';
};

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
    IonAvatar,
    IonButton,
    BiteComponent,
    IonBadge,
    IonIcon,
    IonAlert,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
  ],
})
export class ProfileComponent {
  isAuthenticated = input(false);
  user = input<PublicUser>();
  bites = input<Bite[]>();
  profileMetadata = input<ProfileMetaData>();
  userId = input<string>();
  subscriptionTier = computed((): number => {
    return this.user()?.subscriptionTier || 0;
  });

  readonly logoutClick = output();
  readonly gotoSettings = output();
  readonly gotoMyBucketlists = output();
  readonly gotoMyBites = output();
  readonly gotoMyProfile = output();
  readonly gotoEditProfile = output();

  readonly biteClick = output<Bite>();
  readonly restaurantClick = output<Bite>();
  readonly likeButtonClick = output<Like>();
  readonly followButtonClick = output<PublicUser>();
  readonly unfollowButtonClick = output<PublicUser>();
  readonly followersClick = output<string>();
  readonly followingClick = output<string>();

  isOpen = signal(false);
  currentPage = signal<number>(1);

  confirmationButtons = [
    {
      text: 'Cancel',
      role: CANCEL,
    },
    {
      text: 'Yes, unfollow',
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
    const bites = this.bites();

    return bites ? bites.length : 0;
  });

  displayedBites = computed(() => {
    const allBites = this.bites() || [];
    const page = this.currentPage();
    const startIndex = 0;
    const endIndex = page * PAGE_SIZE;

    return allBites.slice(startIndex, endIndex);
  });

  badgeColor = computed(() => {
    const biteCount = this.biteCount();

    return getBadgeColor(biteCount);
  });

  isUnfollowedUser = computed((): boolean => {
    const currentUserId = this.userId();
    const profileOwner = this.user()?.userId;

    if (!profileOwner) {
      return false;
    }

    return currentUserId !== profileOwner;
  });

  imageLoadErrored = signal(false);
  validPhotoUrl = computed(() => {
    return !!this.user()?.photoUrl && !this.imageLoadErrored();
  });

  onImageError(): void {
    this.imageLoadErrored.set(true);
  }

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
