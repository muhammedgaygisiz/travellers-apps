import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FollowersListComponent } from '../components/followers-list/followers-list.component';
import { FollowersService } from './followers.service';

@Component({
  selector: 'followers-container',
  template: `
    <followers-list
      class="ion-page"
      [users]="service.usersValue()"
      [type]="service.type()"
      [loggedInUserId]="service.loggedInUserId()"
      [isLoading]="service.users.isLoading()"
      [hasError]="service.usersFailed()"
      [profileOwnerid]="service.userIdFromUrl()"
      (userClick)="service.userClicked($event)"
      (unfollowClick)="service.unfollowClicked($event)"
      (retryClick)="service.retryLoad()"
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
