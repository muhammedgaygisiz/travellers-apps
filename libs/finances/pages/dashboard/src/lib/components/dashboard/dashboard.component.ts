import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'finances-dashboard',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {}
