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
import {
  IonAlert,
  IonAvatar,
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
} from '@ionic/angular/standalone';
import type { PublicUser } from 'model';
import { PATH } from 'utils';
import { PageComponent } from 'common/ui/page';
import { OverlayEventDetail } from '@ionic/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ImageErroredPipe } from './pipes/image-errored.pipe';

const UNFOLLOW = 'unfollow';
const CANCEL = 'cancel';

@Component({
  selector: 'followers-list',
  standalone: true,
  imports: [
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonAvatar,
    PageComponent,
    IonSpinner,
    IonAlert,
    IonIcon,
    TranslocoPipe,
    ImageErroredPipe,
  ],
  templateUrl: 'followers-list.component.html',
  styleUrls: ['followers-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowersListComponent {
  private readonly transloco = inject(TranslocoService);

  users = input.required<PublicUser[] | undefined>();
  type = input.required<'followers' | 'following'>();
  loggedInUserId = input<string>();
  isLoading = input<boolean>(false);
  /** The read failed, which is not the same as having no followers (#1232). */
  hasError = input(false, { transform: booleanAttribute });
  profileOwnerid = input<string>();

  userClick = output<PublicUser>();
  unfollowClick = output<PublicUser>();
  retryClick = output<void>();

  /**
   * The row whose unfollow is awaiting confirmation, rather than a boolean.
   * A boolean was shared by every row, so one alert per row was constructed up
   * front and a click on any row opened all of them at once — the topmost being
   * the last row's, which is the one that got unfollowed. See GitHub issue
   * #1334.
   */
  userPendingUnfollow = signal<PublicUser | undefined>(undefined);
  imageErroredUserIds = signal<Set<string>>(new Set());

  sortedUsers = computed(() =>
    [...(this.users() ?? [])].sort((a, b) =>
      (a.displayName ?? '').localeCompare(b.displayName ?? ''),
    ),
  );

  onImageError(userId: string): void {
    this.imageErroredUserIds.update((set) => new Set([...set, userId]));
  }

  toggleTitleText = computed(() => {
    const type = this.type();

    return type === 'followers'
      ? this.transloco.translate('followers')
      : this.transloco.translate('following');
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

  readonly defaultHref = `/${PATH.MY_PROFILE}`;

  openConfirmationDialog(
    event: Pick<Event, 'stopPropagation'>,
    user: PublicUser,
  ): void {
    event.stopPropagation();
    this.userPendingUnfollow.set(user);
  }

  handleConfirmationDismiss(
    event: CustomEvent<OverlayEventDetail>,
    user: PublicUser,
  ): void {
    const role = event.detail.role;

    if (role === UNFOLLOW) {
      this.unfollow(user);
    }

    this.userPendingUnfollow.set(undefined);
  }

  unfollow(user: PublicUser): void {
    if (user) {
      this.unfollowClick.emit(user);
    }
  }
}
