import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addNecessaryIcons } from 'bite-tribe-business/shell';

@Component({
  selector: 'bt-business-root',
  template: `
    <ion-app>
      <ion-router-outlet />
    </ion-app>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  title = 'bite-tribe-business';

  constructor() {
    addNecessaryIcons();
  }
}
