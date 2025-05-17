import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DashboardComponent } from '../component/page/dashboard.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardComponent],
  template: ` <bt-business-dashboard class="ion-page" /> `,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class DashboardContainer {}
