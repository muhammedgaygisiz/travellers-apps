import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FollowersListComponent } from '../components/followers-list/followers-list.component';
import { FollowersService } from './followers.service';

@Component({
  selector: 'followers-container',
  template: `
    <followers-list
      class="ion-page"
      [users]="service.users.value()"
      [type]="service.type()"
      [currentUserId]="service.currentUserId()"
      [isLoading]="service.users.isLoading()"
      (userClick)="service.userClicked($event)"
      (unfollowClick)="service.unfollowClicked($event)"
    />
  `,
  imports: [FollowersListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowersContainer {
  service = inject(FollowersService);

  ionViewDidEnter(): void {
    const type = this.service.type();
    FirebaseAnalytics.setCurrentScreen({
      screenName: type,
    });
  }
}
