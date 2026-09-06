import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardComponent } from '../component/page/dashboard.component';
import { DashboardService } from './dashboard.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardComponent],
  template: `
    <bt-business-dashboard
      class="ion-page"
      [isAuthenticated]="service.isAuthenticated()"
      [gpsPosition]="service.gpsPosition()"
      [restaurants]="service.restaurantsValue()"
      (logoutClick)="service.logout()"
      (sectionClick)="service.sectionClicked($event)"
    />
  `,
})
export class DashboardContainer {
  service = inject(DashboardService);
}
