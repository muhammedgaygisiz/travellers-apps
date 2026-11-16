import { computed, inject, Injectable } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { BiteTribeStoreService } from 'bite-tribe/store';
import {
  CountryBoard,
  LeaderboardBoard,
  LeaderboardDataAccessService,
  LeaderboardUser,
  MostLikedBite,
} from 'bite-tribe/leaderboard-data-access';
import { PATH } from 'utils';

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly navController = inject(NavController);
  private readonly dataAccess = inject(LeaderboardDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);

  /** The signed-in user, whose own place is highlighted (#2032). */
  readonly currentUserId = computed(() => this.storeService.user()?.uid);

  readonly board = this.dataAccess.board.asReadonly();
  readonly ranking = this.dataAccess.ranking;
  readonly loadedRanking = this.dataAccess.loadedRanking;
  readonly countryBoard = this.dataAccess.countryBoard.asReadonly();
  readonly countryRanking = this.dataAccess.countryRanking;
  readonly loadedCountryRanking = this.dataAccess.loadedCountryRanking;

  /** Opens the country ranking (issue #2043). */
  openCountries(): void {
    this.navController.navigateForward([PATH.LEADERBOARD_COUNTRIES]);
  }

  selectCountryBoard(board: CountryBoard): void {
    this.dataAccess.countryBoard.set(board);
  }

  /** Opens the country's Bites in the country search. */
  countryClicked(countryCode: string): void {
    this.navController.navigateForward([PATH.SEARCH], {
      queryParams: { country: countryCode },
    });
  }

  reload(): void {
    this.ranking.reload();
  }

  /** Shows another ranking; the resource reloads for the new board. */
  selectBoard(board: LeaderboardBoard): void {
    this.dataAccess.board.set(board);
  }

  biteClicked(bite: MostLikedBite): void {
    this.navController.navigateForward([PATH.BITE, bite.biteId]);
  }

  userClicked(user: LeaderboardUser): void {
    if (user.public) {
      this.navController.navigateForward([PATH.PROFILE, user.userId]);
    }
  }
}
