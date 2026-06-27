import { inject, Injectable } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import {
  LeaderboardDataAccessService,
  LeaderboardUser,
} from 'bite-tribe/leaderboard-data-access';
import { PATH } from 'utils';

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly navController = inject(NavController);
  private readonly dataAccess = inject(LeaderboardDataAccessService);

  users = this.dataAccess.users;

  userClicked(user: LeaderboardUser): void {
    if (user.public) {
      this.navController.navigateForward([PATH.PROFILE, user.userId]);
    }
  }
}
