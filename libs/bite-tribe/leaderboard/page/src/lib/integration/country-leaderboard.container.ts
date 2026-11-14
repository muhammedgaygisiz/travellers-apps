import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { CountryLeaderboardComponent } from '../components/country-leaderboard/country-leaderboard.component';
import { LeaderboardService } from './leaderboard.service';

/** The country ranking page (issue #2043), opened from the leaderboard. */
@Component({
  selector: 'country-leaderboard-container',
  template: `
    <country-leaderboard
      class="ion-page"
      [board]="service.countryBoard()"
      [ranking]="service.countryRanking.value()"
      [isLoading]="service.countryRanking.isLoading()"
      (boardChange)="service.selectCountryBoard($event)"
      (countryClick)="service.countryClicked($event)"
    />
  `,
  imports: [CountryLeaderboardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountryLeaderboardContainer {
  service = inject(LeaderboardService);

  ionViewDidEnter(): void {
    this.service.countryRanking.reload();

    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Country leaderboard',
    });
  }
}
