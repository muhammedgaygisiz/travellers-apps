import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
} from '@angular/core';
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
      [menusBuiltFromBites]="service.menusBuiltFromBites()"
      [figures]="service.figures()"
      [restaurantsLoaded]="service.restaurantsLoaded()"
      (checkAgainClick)="service.refreshRestaurants()"
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

  /**
   * An account waiting for its restaurant is usually on a call with the
   * operator who assigns it, in another tab or app. Coming back here re-reads,
   * so the restaurant shows without signing out (GitHub issue #2127).
   */
  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.service.refreshRestaurants();
    }
  }
}
