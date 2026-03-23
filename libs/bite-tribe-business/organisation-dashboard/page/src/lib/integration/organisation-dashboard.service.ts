import { inject, Injectable } from '@angular/core';
import { OrganisationDashboardDataAccessService } from 'bite-tribe-business/organisation-dashboard-data-access';
import { PublicUser } from 'model';

@Injectable({ providedIn: 'root' })
export class OrganisationDashboardService {
  dataAccess = inject(OrganisationDashboardDataAccessService);

  employees = this.dataAccess.employees;
  bites = this.dataAccess.bites;

  selectEmployee(user: PublicUser): void {
    this.dataAccess.selectedUserId.set(user.userId);
  }
}
