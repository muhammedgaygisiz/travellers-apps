import { inject, Injectable } from '@angular/core';
import { OrganisationDashboardDataAccessService } from 'bite-tribe-business/organisation-dashboard-data-access';

@Injectable({ providedIn: 'root' })
export class OrganisationDashboardService {
  dataAccess = inject(OrganisationDashboardDataAccessService);

  employees = this.dataAccess.employees;
}
