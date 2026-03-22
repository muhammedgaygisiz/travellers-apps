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
  template: `
    @let userData = user();

    <div class="profile-header">
      <div class="photo-column">
        @if (validPhotoUrl()) {
          <ion-avatar class="profile-avatar">
            <img
              [src]="userData?.photoUrl"
              [alt]="userData?.displayName"
              (error)="onImageError()"
            />
          </ion-avatar>
        } @else {
          <ion-icon name="person-circle-outline" class="profile-image" />
        }
      </div>

      <div class="header-column">
        <strong>{{
          userData?.isOrganisation ? 'Bite Trails' : 'Bites'
        }}</strong>
        @let calculatedBadgeColor = badgeColor();
        @if (calculatedBadgeColor) {
          <ion-badge class="bite-badge {{ calculatedBadgeColor }}">
            {{ userData?.isOrganisation ? biteTrailCount() : biteCount() }}
          </ion-badge>
        } @else {
          {{ userData?.isOrganisation ? biteTrailCount() : biteCount() }}
        }
      </div>
      <div class="header-column">
        <strong>Following</strong>
        <span
          class="clickable"
          (click)="followingClick.emit(user()?.userId!)"
          >{{ followingCount() }}</span
        >
      </div>
      <div class="header-column">
        <strong>Followers</strong>
        <span
          class="clickable"
          (click)="followersClick.emit(user()?.userId!)"
          >{{ followerCount() }}</span
        >
      </div>
    </div>
  `,
  styles: `
    :host {
      .profile-header {
        margin: 0 auto;
        display: flex;
        justify-content: space-between;

        strong {
          margin-bottom: 1rem;
        }

        .header-column {
          display: flex;
          flex-direction: column;
          justify-content: center;

          .clickable {
            cursor: pointer;
            color: var(--ion-color-primary);
            font-weight: 600;

            &:hover {
              text-decoration: underline;
            }
          }
        }

        .profile-avatar {
          display: flex;
          width: 100%;
          height: fit-content;

          img {
            width: 96px;
            height: 96px;
            border-radius: 50%;
          }
        }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonAvatar, IonBadge, IonIcon],
})
export class ProfileHeader {
  user = input<PublicUser | undefined>();
  biteCount = input(0);
  biteTrailCount = input(0);
  followingCount = input(0);
  followerCount = input(0);

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
}
