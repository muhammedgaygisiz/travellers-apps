import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardComponent } from '../components/dashboard/dashboard.component';
import { DashboardService } from './dashboard.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <finances-dashboard
      [banks]="service.store.banks()"
      (openAccountDetails)="service.onOpenAccountDetails($event)"
      (addMenuItemClicked)="service.onAddMenuItemClicked()"
      (logoutClicked)="service.onLogoutClicked()"
    />
  `,
  imports: [DashboardComponent],
  selector: 'finances-dashboard-integration',
})
export class DashboardContainerComponent {
  service = inject(DashboardService);
}
