import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MenuPage } from '../components/page/menu-page.component';
import { MenuService } from './menu.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  template: `
    <menu-page
      class="ion-page"
      [bite]="service.bite()"
      [restaurant]="service.restaurant()"
      [menu]="service.menu()"
      [isMenuLoading]="service.isMenuLoading()"
      [isMenuUnavailable]="service.isMenuUnavailable()"
      (createBiteClick)="service.prepareBiteFromMenuItem($event)"
      (goBack)="service.goBack()"
      (retryLoad)="service.retryMenuLoad()"
    />
  `,
  imports: [MenuPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuContainer {
  service = inject(MenuService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Menu',
    });
  }
}
