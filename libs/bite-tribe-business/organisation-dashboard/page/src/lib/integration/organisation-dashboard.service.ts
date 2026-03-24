import { inject, Injectable } from '@angular/core';
import { OrganisationDashboardDataAccessService } from 'bite-tribe-business/organisation-dashboard-data-access';
import { Bite, PublicUser } from 'model';

@Injectable({ providedIn: 'root' })
export class OrganisationDashboardService {
  dataAccess = inject(OrganisationDashboardDataAccessService);

  employees = this.dataAccess.employees;
  bites = this.dataAccess.bites;
  selectedEmployeeIds = this.dataAccess.selectedUserIds;
  selectedBiteIds = this.dataAccess.selectedBiteIds;

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

  toggleBite(bite: Bite): void {
    const currentIds = this.dataAccess.selectedBiteIds();
    const biteIndex = currentIds.indexOf(bite.id);
    if (biteIndex > -1) {
      this.dataAccess.selectedBiteIds.set(
        currentIds.filter((id) => id !== bite.id),
      );
    } else {
      this.dataAccess.selectedBiteIds.set([...currentIds, bite.id]);
    }
  }

  loadBites(): void {
    this.dataAccess.loadBitesTrigger.set([
      ...this.dataAccess.selectedUserIds(),
    ]);
  }

  createBiteTrail(): void {
    const selectedBiteIds = this.dataAccess.selectedBiteIds();
    void this.dataAccess.createBiteTrail(selectedBiteIds);
  }
}
