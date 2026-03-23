import { inject, Injectable } from '@angular/core';
import { OrganisationDashboardDataAccessService } from 'bite-tribe-business/organisation-dashboard-data-access';
import { PublicUser } from 'model';

@Injectable({ providedIn: 'root' })
export class OrganisationDashboardService {
  dataAccess = inject(OrganisationDashboardDataAccessService);

  employees = this.dataAccess.employees;
  bites = this.dataAccess.bites;
  selectedEmployeeIds = this.dataAccess.selectedUserIds;

  toggleEmployee(user: PublicUser): void {
    const currentIds = this.dataAccess.selectedUserIds();
    const userIndex = currentIds.indexOf(user.userId);
    if (userIndex > -1) {
      this.dataAccess.selectedUserIds.set(
        currentIds.filter((id) => id !== user.userId),
      );
    } else {
      this.dataAccess.selectedUserIds.set([...currentIds, user.userId]);
    }
  }

  loadBites(): void {
    this.dataAccess.loadBitesTrigger.set([
      ...this.dataAccess.selectedUserIds(),
    ]);
  }
}
