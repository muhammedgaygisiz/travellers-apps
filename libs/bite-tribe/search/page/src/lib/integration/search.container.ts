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
      [users]="service.users.value()"
      [isLoading]="service.users.isLoading()"
      [hasSearched]="service.hasSearched()"
      (searchTextChange)="service.searchUsers($event)"
      (userClick)="service.userClicked($event)"
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
