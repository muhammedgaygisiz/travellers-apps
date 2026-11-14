import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { SearchPage } from '../components/search-page/search.page';
import { SearchService } from './search.service';

@Component({
  selector: 'search-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <search-page
      class="ion-page"
      [results]="service.visibleResults()"
      [selectedCategory]="service.selectedCategory()"
      [selectedCountryCode]="service.selectedCountryCode()"
      [isLoading]="service.results.isLoading()"
      [hasSearched]="service.hasSearched()"
      (searchTextChange)="service.search($event)"
      (categoryChange)="service.selectCategory($event)"
      (countryChange)="service.selectCountry($event)"
      (resultClick)="service.resultClicked($event)"
    />
  `,
  imports: [SearchPage],
})
export class SearchContainer {
  readonly service = inject(SearchService);
  private readonly route = inject(ActivatedRoute);

  ionViewWillEnter(): void {
    // The country leaderboard opens a country's Bites as `?country=BA`
    // (issue #2043).
    const country = this.route.snapshot.queryParamMap.get('country');

    if (country) {
      this.service.selectCategory('country');
      this.service.selectCountry(country.toUpperCase());
    }
  }

  ionViewDidEnter(): void {
    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'Search',
    });
  }
}
