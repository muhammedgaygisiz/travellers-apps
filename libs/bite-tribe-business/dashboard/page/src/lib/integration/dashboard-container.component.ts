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
      (setupItemClick)="service.setupItemClicked($event)"
    />
  `,
})
export class DashboardContainer {
  service = inject(DashboardService);

  /**
   * Ionic keeps this page alive under the edit page, so returning here does
   * not construct it again. Re-reading on every entry is what makes an item
   * completed on the edit page show ticked (GitHub issue #2126).
   */
  ionViewWillEnter(): void {
    this.service.refreshRestaurants();
  }
}
