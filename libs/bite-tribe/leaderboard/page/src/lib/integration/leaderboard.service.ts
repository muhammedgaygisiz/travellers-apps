import { inject, Injectable } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import {
  LeaderboardBoard,
  LeaderboardDataAccessService,
  LeaderboardUser,
} from 'bite-tribe/leaderboard-data-access';
import { PATH } from 'utils';

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly navController = inject(NavController);
  private readonly dataAccess = inject(LeaderboardDataAccessService);

  readonly board = this.dataAccess.board.asReadonly();
  readonly ranking = this.dataAccess.ranking;

  reload(): void {
    this.ranking.reload();
  }

  /** Shows another ranking; the resource reloads for the new board. */
  selectBoard(board: LeaderboardBoard): void {
    this.dataAccess.board.set(board);
  }

  userClicked(user: LeaderboardUser): void {
    if (user.public) {
      this.navController.navigateForward([PATH.PROFILE, user.userId]);
    }
  }
}
