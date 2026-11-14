import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { CoachMarkComponent } from 'bite-tribe/coach-mark';
import { LeaderboardListComponent } from '../components/leaderboard-list/leaderboard-list.component';
import { LeaderboardService } from './leaderboard.service';

@Component({
  selector: 'leaderboard-container',
  template: `
    <leaderboard-list
      class="ion-page"
      [board]="service.board()"
      [ranking]="service.ranking.value()"
      [isLoading]="service.ranking.isLoading()"
      (boardChange)="service.selectBoard($event)"
      (userClick)="service.userClicked($event)"
    />

    <bt-coach-mark
      surface="leaderboard"
      titleKey="coach-leaderboard-title"
      bodyKey="coach-leaderboard-body"
    />
  `,
  imports: [LeaderboardListComponent, CoachMarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardContainer {
  service = inject(LeaderboardService);

  ionViewDidEnter(): void {
    this.service.reload();

    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Leaderboard',
    });
  }
}
