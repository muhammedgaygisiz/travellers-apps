import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonContent } from '@ionic/angular/standalone';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'bt-business-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [PageComponent, IonContent],
  styleUrl: 'dashboard.component.scss',
})
export class DashboardComponent {
  readonly logoutClick = output();
  readonly gotoSettings = output();
}
