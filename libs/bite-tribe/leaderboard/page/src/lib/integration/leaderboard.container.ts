import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { LeaderboardBoard } from 'bite-tribe/leaderboard-data-access';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { CoachMarkComponent } from 'bite-tribe/coach-mark';
import { LeaderboardListComponent } from '../components/leaderboard-list/leaderboard-list.component';
import { LeaderboardService } from './leaderboard.service';

/** The boards a link may open the leaderboard on. */
const BOARDS_FROM_LINK: readonly LeaderboardBoard[] = [
  'thisWeek',
  'lastWeek',
  'allTime',
  'mostLiked',
  'mostLikedLastWeek',
];

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
      (biteClick)="service.biteClicked($event)"
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
  private readonly route = inject(ActivatedRoute);

  ionViewDidEnter(): void {
    // A Most liked rank notification opens `?board=mostLiked` (issue #2028).
    const board = this.route.snapshot.queryParamMap.get('board');

    if (board && BOARDS_FROM_LINK.includes(board as LeaderboardBoard)) {
      this.service.selectBoard(board as LeaderboardBoard);
    }

    this.service.reload();

    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Leaderboard',
    });
  }
}
