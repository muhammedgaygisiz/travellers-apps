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
import { ProfilePhotoStatus } from './profile-photo-status/profile-photo-status';

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
  imports: [IonAvatar, IonBadge, IonIcon, ProfilePhotoStatus, TranslocoPipe],
})
export class ProfileHeader {
  user = input<PublicUser | undefined>();
  biteCount = input(0);
  followingCount = input<number | undefined>(0);
  followerCount = input<number | undefined>(0);

  /**
   * Whether a new photo's upload status belongs here: on the own profile
   * only, because everybody else keeps seeing the previous photo until the
   * new one lands (GitHub issue #1953).
   */
  showPhotoStatus = input(false);

  /** The new photo while it uploads, shown blurred under the status. */
  pendingPhoto = input<string | undefined>();

  readonly retryPhotoUpload = output<void>();

  readonly followersClick = output<string>();
  readonly followingClick = output<string>();

  imageLoadErrored = signal(false);

  validPhotoUrl = computed(() => {
    return !!this.user()?.photoUrl && !this.imageLoadErrored();
  });

  /** A new photo is on its way, or failed to arrive. */
  photoInFlight = computed((): boolean => {
    const status = this.user()?.photoStatus;

    return (
      this.showPhotoStatus() && (status === 'pending' || status === 'failed')
    );
  });

  /**
   * The photo under the status: the new one where this device still holds
   * it, otherwise the previous one - blurred either way.
   */
  statusPhoto = computed((): string | undefined =>
    this.photoInFlight() ? this.pendingPhoto() : undefined,
  );

  badgeColor = computed(() => {
    return getBadgeColor(this.biteCount());
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
