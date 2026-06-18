import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { SearchPage } from '../components/search-page/search.page';
import { SearchService } from './search.service';

@Component({
  selector: 'search-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <search-page
      class="ion-page"
      [results]="service.results.value()"
      [selectedCategory]="service.selectedCategory()"
      [isLoading]="service.results.isLoading()"
      [hasSearched]="service.hasSearched()"
      (searchTextChange)="service.search($event)"
      (categoryChange)="service.selectCategory($event)"
      (resultClick)="service.resultClicked($event)"
    />
  `,
  imports: [SearchPage],
})
export class SearchContainer {
  readonly service = inject(SearchService);

  ionViewDidEnter(): void {
    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'Search',
    });
  }
}
