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
import { addNecessaryIcons, AppForegroundService } from 'bite-tribe/shell';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { Router } from '@angular/router';
import { PATH } from 'utils';
import { ConnectionStatus, Network } from '@capacitor/network';
import { NetworkStatusService } from 'common/networkstatus';
import { TranslocoService } from '@jsverse/transloco';
import { Preferences } from '@capacitor/preferences';

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
  private readonly router = inject(Router);
  private readonly appForegroundService = inject(AppForegroundService);
  private readonly networkStatusService = inject(NetworkStatusService);
  private readonly transloco = inject(TranslocoService);

  backButtonHandler = ({ canGoBack }: { canGoBack: boolean }): void =>
    this.handleBackButton(canGoBack);

  constructor() {
    void this.initLanguage();

    addNecessaryIcons();

    this.initBackbuttonHandler();

    this.initAppUrlOpenHandler();

    this.initAppStateChangeHandler();
    this.initNetworkStatusHandler();
  }

  async initLanguage(): Promise<void> {
    const { value } = await Preferences.get({ key: 'lang' });
    this.transloco.setActiveLang(value ?? 'en');
  }

  ngOnInit(): void {
    this.platform.ready().then(() => {
      void SplashScreen.hide();
    });
  }

  ngOnDestroy(): void {
    void App.removeAllListeners();
  }

  private initBackbuttonHandler(): void {
    void App.addListener('backButton', this.backButtonHandler.bind(this));
  }

  private handleBackButton(canGoBack: boolean): void {
    const isOnHomeView = this.router.url === `/${PATH.HOME}`;

    if (!canGoBack || isOnHomeView) {
      void App.minimizeApp();
    } else {
      window.history.back();
    }
  }

  private initAppUrlOpenHandler(): void {
    void App.addListener('appUrlOpen', (data) => {
      const url = new URL(data.url);
      const path = url.pathname;

      if (path.startsWith('/s/bite/')) {
        const biteId = path.split('/s/bite/')[1];
        void this.navController.navigateForward(['bite', biteId]);
      }
    });
  }

  private initAppStateChangeHandler(): void {
    void App.addListener('appStateChange', ({ isActive }) => {
      this.appForegroundService.handleAppStateChange(isActive);
    });
  }

  private initNetworkStatusHandler(): void {
    void Network.addListener(
      'networkStatusChange',
      (event: ConnectionStatus) => {
        this.networkStatusService.setNetworkStatus(event);
      },
    );
  }
}
