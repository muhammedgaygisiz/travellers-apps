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
  IonAvatar,
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { Bite, ProfileMetaData, PublicUser } from 'model';

import { BiteComponent } from 'bite-tribe-common/bite';

const BADGE_CONFIG = [
  { min: 50, max: 100, cssClassName: 'green' },
  { min: 100, max: 1000, cssClassName: 'bronze' },
  { min: 1000, max: 10000, cssClassName: 'silver' },
  { min: 10000, max: Infinity, cssClassName: 'gold' },
];

const getBadgeColor = (biteCount: number): string => {
  for (const config of BADGE_CONFIG) {
    if (biteCount >= config.min && biteCount < config.max) {
      return config.cssClassName;
    }
  }

  return '';
};

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
  ],
})
export class ProfileComponent {
  isAuthenticated = input(false);
  user = input<PublicUser>();
  bites = input<Bite[]>();
  profileMetadata = input<ProfileMetaData>();
  userId = input<string>();
  subscriptionTier = input<number>(0);

  readonly logoutClick = output();
  readonly gotoSettings = output();
  readonly gotoMyBucketlists = output();
  readonly gotoMyBites = output();
  readonly gotoMyProfile = output();
  readonly gotoEditProfile = output();

  readonly biteClick = output<Bite>();
  readonly restaurantClick = output<Bite>();
  readonly likeButtonClick = output<{ likeType: string; biteId: string }>();
  readonly followButtonClick = output<PublicUser>();

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

  protected onUnfollow(): void {
    // TODO
  }
}
