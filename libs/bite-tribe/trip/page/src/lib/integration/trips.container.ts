import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TripsPage } from '../components/trips-page/trips.page';
import { TripsService } from './trips.service';

@Component({
  selector: 'bt-trips',
  template: `
    <bt-trips-page
      class="ion-page"
      [trips]="service.trips()"
      [loaded]="service.loaded()"
      [today]="service.today()"
      (createTrip)="service.createTrip($event)"
      (updateTrip)="service.updateTrip($event)"
      (deleteTrip)="service.deleteTrip($event)"
      (gotoTrip)="service.gotoTrip($event)"
    />
  `,
  imports: [TripsPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripsContainerComponent {
  protected readonly service = inject(TripsService);

  ionViewWillEnter(): void {
    this.service.enter();
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({ screenName: 'My Trips' });
  }
}
