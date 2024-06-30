import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageComponent } from 'common/ui/page';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'finances-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [PageComponent],
})
export class DashboardComponent {}
