import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardComponent } from '../component/page/dashboard.component';
import { DashboardService } from './dashboard.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardComponent],
  template: `
    <bt-business-dashboard
      class="ion-page"
      [organisations]="service.organisations.value()"
      [restaurants]="service.restaurants.value()"
      [bitePlaces]="service.bitePlaces.value()"
      [restaurantCandidates]="service.restaurantCandidates.value()"
      [isAuthenticated]="service.isAuthenticated()"
      [gpsPosition]="service.gpsPosition()"
      (logoutClick)="service.logout()"
      (restaurantClick)="service.restaurantClicked($event)"
      (restaurantCandidateClick)="service.restaurantCandidateClicked($event)"
      (organisationClick)="service.organisationClicked($event)"
      (menuNavigate)="service.onMenuNavigate($event)"
      (placeClick)="service.placeClicked($event)"
    />
  `,
})
export class DashboardContainer {
  service = inject(DashboardService);
}
