import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'budget-planner-root',
  template: `
    <ion-app>
      <ion-router-outlet />
    </ion-app>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  title = 'budget-planner';
}
