import {
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
  profileOwnerid = input<string>();

  userClick = output<PublicUser>();
  unfollowClick = output<PublicUser>();

  isOpen = signal(false);
  imageErroredUserIds = signal<Set<string>>(new Set());

  onImageError(userId: string): void {
    this.imageErroredUserIds.update((set) => new Set([...set, userId]));
  }

  isImageErrored(userId: string): boolean {
    return this.imageErroredUserIds().has(userId);
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

  openConfirmationDialog(event: any): void {
    event.stopPropagation();
    this.isOpen.set(true);
  }

  handleConfirmationDismiss(
    event: CustomEvent<OverlayEventDetail>,
    user: PublicUser,
  ): void {
    const role = event.detail.role;

    if (role === UNFOLLOW) {
      this.unfollow(user);
    }

    this.isOpen.set(false);
  }

  unfollow(user: PublicUser): void {
    if (user) {
      this.unfollowClick.emit(user);
    }
  }
}
