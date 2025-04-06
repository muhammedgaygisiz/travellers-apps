import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardComponent } from '../components/dashboard/dashboard.component';
import { DashboardStore } from './dashboard.store';
import { DashboardService } from './dashboard.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` @if (service.banks()) {}
    <finances-dashboard
      [banks]="store.banks()"
      (addMenuItemClicked)="service.onAddMenuItemClicked($event)"
    />`,
  imports: [DashboardComponent],
  selector: 'finances-dashboard-integration',
})
export class DashboardContainerComponent {
  store = inject(DashboardStore);
  service = inject(DashboardService);
}
