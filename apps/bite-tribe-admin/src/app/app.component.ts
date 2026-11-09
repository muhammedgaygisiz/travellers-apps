import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import {
  AppCheckGateComponent,
  AppCheckReadinessService,
  StageRibbonComponent,
} from 'ta-firestore';
import { addNecessaryIcons } from 'bite-tribe-admin/shell';

@Component({
  selector: 'bt-admin-root',
  template: `
    <ion-app>
      @if (appCheckReadiness.isBlocked()) {
        <bite-app-check-gate />
      } @else {
        <ion-router-outlet />
      }
      <bite-stage-ribbon />
    </ion-app>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonApp,
    IonRouterOutlet,
    AppCheckGateComponent,
    StageRibbonComponent,
  ],
})
export class AppComponent {
  title = 'bite-tribe-admin';

  readonly appCheckReadiness = inject(AppCheckReadinessService);

  constructor() {
    addNecessaryIcons();
  }
}
