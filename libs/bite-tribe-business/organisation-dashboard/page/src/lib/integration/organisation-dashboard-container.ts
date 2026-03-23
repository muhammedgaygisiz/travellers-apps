import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OrganisationDashboardService } from './organisation-dashboard.service';
import { OrganisationDashboard } from '../components/page/organisation-dashboard';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <organisation-dashboard
      class="ion-page"
      [employees]="service.employees.value()"
    />
  `,
  imports: [OrganisationDashboard],
})
export class OrganisationDashboardContainer {
  service = inject(OrganisationDashboardService);
}
