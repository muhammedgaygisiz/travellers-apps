import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { IonAvatar, IonBadge, IonIcon } from '@ionic/angular/standalone';
import { PublicUser } from 'model';
import { TranslocoPipe } from '@jsverse/transloco';

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

@Component({
  selector: 'profile-header',
  templateUrl: 'profile-header.html',
  styleUrl: 'profile-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonAvatar, IonBadge, IonIcon, TranslocoPipe],
})
export class ProfileHeader {
  user = input<PublicUser | undefined>();
  biteCount = input(0);
  biteTrailCount = input(0);
  followingCount = input<number | undefined>(0);
  followerCount = input<number | undefined>(0);

  readonly followersClick = output<string>();
  readonly followingClick = output<string>();

  imageLoadErrored = signal(false);

  validPhotoUrl = computed(() => {
    return !!this.user()?.photoUrl && !this.imageLoadErrored();
  });

  badgeColor = computed(() => {
    const biteTrailCount = this.biteTrailCount();
    const userData = this.user();

    if (userData?.isOrganisation) {
      return getBadgeColor(biteTrailCount);
    }

    const biteCount = this.biteCount();

    return getBadgeColor(biteCount);
  });

  onImageError(): void {
    this.imageLoadErrored.set(true);
  }

  handleFollowingClick(): void {
    const userId = this.user()?.userId;
    if (userId && (this.followingCount() || 0) > 0) {
      this.followingClick.emit(userId);
    }
  }

  handleFollowersClick(): void {
    const userId = this.user()?.userId;
    if (userId && (this.followerCount() || 0) > 0) {
      this.followersClick.emit(userId);
    }
  }
}
