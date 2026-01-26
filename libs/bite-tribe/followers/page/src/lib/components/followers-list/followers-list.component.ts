import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
  IonAvatar,
  IonBackButton,
  IonButtons,
} from '@ionic/angular/standalone';
import type { PublicUser } from 'model';
import { PATH } from 'utils';

@Component({
  selector: 'followers-list',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonAvatar,
    IonBackButton,
    IonButtons,
  ],
  templateUrl: './followers-list.component.html',
  styleUrls: ['./followers-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowersListComponent {
  users = input.required<PublicUser[]>();
  type = input.required<'followers' | 'following'>();
  currentUserId = input<string>();
  isLoading = input<boolean>(false);

  userClick = output<PublicUser>();
  unfollowClick = output<PublicUser>();

  readonly defaultHref = `/${PATH.MY_PROFILE}`;
}
