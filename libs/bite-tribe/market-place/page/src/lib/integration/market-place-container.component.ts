import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MarketPlacePage } from '../components/market-place-page/market-place.page';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { MarketPlaceService } from './market-place.service';

@Component({
  selector: 'market-place-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <market-place-page
      class="ion-page"
      [biteTrails]="service.biteTrails.value()"
    />
  `,
  imports: [MarketPlacePage],
})
export class MarketPlaceContainerComponent {
  service = inject(MarketPlaceService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Market Place',
    });
  }
}
