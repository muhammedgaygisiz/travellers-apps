import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  IonApp,
  IonRouterOutlet,
  NavController,
  Platform,
} from '@ionic/angular/standalone';
import { addNecessaryIcons } from 'bite-tribe/shell';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';

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
export class AppComponent implements OnInit, OnDestroy {
  title = 'bite-tribe';

  platform = inject(Platform);
  navController = inject(NavController);

  backButtonHandler = ({ canGoBack }: { canGoBack: boolean }): void =>
    this.handleBackButton(canGoBack);

  constructor() {
    addNecessaryIcons();

    this.initBackbuttonHandler();

    this.initAppUrlOpenHandler();
  }

  ngOnInit(): void {
    this.platform.ready().then(() => {
      SplashScreen.hide();
    });
  }

  ngOnDestroy(): void {
    App.removeAllListeners();
  }

  private initBackbuttonHandler(): void {
    App.addListener('backButton', this.backButtonHandler.bind(this));
  }

  private handleBackButton(canGoBack: boolean): void {
    if (!canGoBack) {
      App.exitApp();
    } else {
      window.history.back();
    }
  }

  private initAppUrlOpenHandler(): void {
    App.addListener('appUrlOpen', (data) => {
      const url = new URL(data.url);
      const path = url.pathname;

      if (path.startsWith('/s/bite/')) {
        const biteId = path.split('/s/bite/')[3];
        this.navController.navigateForward(['bite', biteId]);
      }
    });
  }
}
