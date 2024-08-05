import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardComponent } from '../components/dashboard/dashboard.component';
import { DashboardService } from './dashboard.service';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<finances-dashboard
    [banks]="service.banks()"
    (openAccountDetails)="service.openAccountDetails($event)"
  />`,
  imports: [DashboardComponent],
  selector: 'finances-dashboard-container',
})
export class DashboardContainerComponent {
  service = inject(DashboardService);

  banks = this.service.banks;
}
