import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardComponent } from '../components/dashboard/dashboard.component';
import { AsyncPipe } from '@angular/common';
import { DashboardStore } from './dashboard.store';
import { DashboardService } from './dashboard.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` @if (service.banks$ | async) {}
    <finances-dashboard [banks]="store.banks()" />`,
  imports: [DashboardComponent, AsyncPipe],
  selector: 'finances-dashboard-container',
})
export class DashboardContainerComponent {
  store = inject(DashboardStore);
  service = inject(DashboardService);
}
