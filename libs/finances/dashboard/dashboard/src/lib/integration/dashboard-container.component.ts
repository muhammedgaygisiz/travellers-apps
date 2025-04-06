import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardComponent } from '../components/dashboard/dashboard.component';
import { DashboardService } from './dashboard.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <finances-dashboard
      [banks]="service.banks()"
      (addMenuItemClicked)="service.onAddMenuItemClicked($event)"
    />
  `,
  imports: [DashboardComponent],
  selector: 'finances-dashboard-integration',
})
export class DashboardContainerComponent {
  service = inject(DashboardService);
}
