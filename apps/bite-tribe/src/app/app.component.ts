import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular/standalone';
import { addNecessaryIcons } from 'bite-tribe/shell';
import { SplashScreen } from '@capacitor/splash-screen';

@Component({
  selector: 'bt-root',
  template: `
    <ion-app>
      <ion-router-outlet />
    </ion-app>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  title = 'bite-tribe';

  platform = inject(Platform);

  constructor() {
    addNecessaryIcons();
  }

  ngOnInit(): void {
    this.platform.ready().then(() => {
      SplashScreen.hide();
    });
  }
}
