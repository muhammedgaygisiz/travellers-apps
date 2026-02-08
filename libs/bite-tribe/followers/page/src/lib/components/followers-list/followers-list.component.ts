import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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

const UNFOLLOW = 'unfollow';
const CANCEL = 'cancel';

@Component({
  selector: 'followers-list',
  standalone: true,
  imports: [
    CommonModule,
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
  ],
  templateUrl: 'followers-list.component.html',
  styleUrls: ['followers-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowersListComponent {
  users = input.required<PublicUser[] | undefined>();
  type = input.required<'followers' | 'following'>();
  currentUserId = input<string>();
  isLoading = input<boolean>(false);

  userClick = output<PublicUser>();
  unfollowClick = output<PublicUser>();

  isOpen = signal(false);

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
