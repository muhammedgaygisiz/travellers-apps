import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteTrailsComponent } from '../component/bite-trails/bite-trails';
import { DashboardService } from './dashboard.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BiteTrailsComponent],
  template: `
    <bt-business-bite-trails
      class="ion-page"
      [biteTrails]="service.biteTrailsValue()"
      [isAuthenticated]="service.isAuthenticated()"
      (createBiteTrailClick)="service.createBiteTrailClicked()"
      (logoutClick)="service.logout()"
    />
  `,
})
export class BiteTrailsContainer {
  service = inject(DashboardService);
}
