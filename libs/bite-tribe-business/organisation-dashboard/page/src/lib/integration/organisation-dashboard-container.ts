import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OrganisationDashboardService } from './organisation-dashboard.service';
import { OrganisationDashboard } from '../components/page/organisation-dashboard';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <organisation-dashboard
      class="ion-page"
      [employees]="service.employees.value()"
      [bites]="service.bites.value()"
      [selectedEmployeeIds]="service.selectedEmployeeIds()"
      (employeeToggled)="service.toggleEmployee($event)"
      (loadBitesClicked)="service.loadBites()"
    />
  `,
  imports: [OrganisationDashboard],
})
export class OrganisationDashboardContainer {
  service = inject(OrganisationDashboardService);
}
