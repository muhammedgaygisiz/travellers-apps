import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardComponent } from '../component/page/dashboard.component';
import { DashboardService } from './dashboard.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardComponent],
  template: `
    <bt-business-dashboard
      class="ion-page"
      [restaurants]="service.restaurantsValue()"
      [biteTrails]="service.biteTrailsValue()"
      [bitePlaces]="service.bitePlacesValue()"
      [restaurantCandidates]="service.restaurantCandidatesValue()"
      [isAuthenticated]="service.isAuthenticated()"
      [gpsPosition]="service.gpsPosition()"
      (logoutClick)="service.logout()"
      (restaurantClick)="service.restaurantClicked($event)"
      (createBiteTrailClick)="service.createBiteTrailClicked()"
      (restaurantCandidateClick)="service.restaurantCandidateClicked($event)"
      (menuNavigate)="service.onMenuNavigate($event)"
      (placeClick)="service.placeClicked($event)"
    />
  `,
})
export class DashboardContainer {
  service = inject(DashboardService);
}
