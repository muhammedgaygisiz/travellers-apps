import { inject, Injectable } from '@angular/core';
import { DashboardDataAccessService } from 'bite-tribe-business/dashboard-data-access';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  dataAccess = inject(DashboardDataAccessService);

  restaurants = this.dataAccess.restaurants;

  logout() {
    this.dataAccess.logout();
  }
}
