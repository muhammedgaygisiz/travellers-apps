import {
  ChangeDetectionStrategy,
  Component,
  EnvironmentInjector,
} from '@angular/core';

@Component({
  selector: 'travellers-apps-root',
  template: `
    <ion-app>
      <ion-router-outlet
        [environmentInjector]="environmentInjector"
      ></ion-router-outlet>
    </ion-app>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'prices';

  constructor(
    // eslint-disable-next-line no-unused-vars
    public readonly environmentInjector: EnvironmentInjector
  ) {}
}
