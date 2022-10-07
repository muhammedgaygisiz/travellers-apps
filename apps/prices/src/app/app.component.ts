import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'travellers-apps-root',
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'prices';
}
