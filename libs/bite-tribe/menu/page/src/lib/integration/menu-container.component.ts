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
      (createBiteClick)="service.prepareBiteFromMenuItem($event)"
    />
  `,
  imports: [MenuPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class MenuContainer {
  service = inject(MenuService);

  ionViewDidEnter() {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Menu',
    });
  }
}
