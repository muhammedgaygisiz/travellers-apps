import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular/standalone';
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

  constructor() {
    addNecessaryIcons();

    this.initBackbuttonHandler();
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
    App.addListener('backButton', ({ canGoBack }) => {
      this.handleBackButton(canGoBack);
    });
  }

  private handleBackButton(canGoBack: boolean): void {
    if (!canGoBack) {
      App.exitApp();
    } else {
      window.history.back();
    }
  }
}
