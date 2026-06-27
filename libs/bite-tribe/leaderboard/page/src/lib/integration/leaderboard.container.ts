import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { LeaderboardListComponent } from '../components/leaderboard-list/leaderboard-list.component';
import { LeaderboardService } from './leaderboard.service';

@Component({
  selector: 'leaderboard-container',
  template: `
    <leaderboard-list
      class="ion-page"
      [users]="service.users.value()"
      [isLoading]="service.users.isLoading()"
      (userClick)="service.userClicked($event)"
    />
  `,
  imports: [LeaderboardListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardContainer {
  service = inject(LeaderboardService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Leaderboard',
    });
  }
}
