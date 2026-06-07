import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { SearchPage } from '../components/search-page/search.page';

@Component({
  selector: 'search-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <search-page class="ion-page" />
  `,
  imports: [SearchPage],
})
export class SearchContainer {
  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Search',
    });
  }
}
