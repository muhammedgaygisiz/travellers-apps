import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
})
export class UnverifiedRestaurantContainer {
  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Unverified Restaurant',
    });
  }
}
