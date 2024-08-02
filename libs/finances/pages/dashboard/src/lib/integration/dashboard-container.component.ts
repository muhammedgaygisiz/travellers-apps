import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DashboardComponent } from '../components/dashboard/dashboard.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<finances-dashboard />`,
  imports: [DashboardComponent],
})
export class DashboardContainerComponent {}
