import {
    ChangeDetectionStrategy,
    Component,
    EnvironmentInjector,
} from '@angular/core';
import { IonApp, IonRouterOutlet } from "@ionic/angular/standalone";

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

    constructor(
        // eslint-disable-next-line no-unused-vars
        public readonly environmentInjector: EnvironmentInjector
    ) { }
}
