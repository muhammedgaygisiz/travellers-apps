import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addNecessaryIcons } from '@travellers-apps/utils-common';

@Component({
  standalone: true,
  selector: 'travellers-apps-root',
  template: `
    <ion-app>
      <ion-router-outlet />
    </ion-app>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  title = 'prices';

  constructor() {
    addNecessaryIcons();
  }
}
