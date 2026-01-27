import {
  ChangeDetectionStrategy,
  Component,
  inject,
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
      [users]="service.users()"
      [type]="service.type()"
      [currentUserId]="service.currentUserId()"
      [isLoading]="service.isLoading()"
      (userClick)="service.userClicked($event)"
      (unfollowClick)="service.unfollowClicked($event)"
    />
  `,
  imports: [FollowersListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowersContainer implements OnInit {
  service = inject(FollowersService);

  async ngOnInit(): Promise<void> {
    //const userId = this.route.snapshot.paramMap.get('userId');
    //const type = this.route.snapshot.paramMap.get('type') as
    //  | 'followers'
    //  | 'following';
    //
    //if (!userId) {
    //  console.error('No userId provided');
    //  return;
    //}
    //
    //if (type === 'followers') {
    //  await this.service.loadFollowers(userId);
    //} else if (type === 'following') {
    //  await this.service.loadFollowing(userId);
    //}
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Followers',
    });
  }
}
