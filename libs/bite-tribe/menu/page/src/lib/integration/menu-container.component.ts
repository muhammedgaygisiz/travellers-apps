import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
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
      [stats]="service.stats()"
      [selectedDish]="service.selectedDish()"
      [dishBites]="service.bitesForDish()"
      [isLoadingBites]="service.isLoadingBites()"
      (biteSignalClick)="service.openBitesFor($event)"
      (closeBites)="service.closeBites()"
      (createBiteClick)="service.prepareBiteFromMenuItem($event)"
      (goBack)="service.goBack()"
      (retryLoad)="service.retryMenuLoad()"
    />
  `,
  imports: [MenuPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuContainer implements OnInit {
  service = inject(MenuService);

  ngOnInit(): void {
    // One read for the whole menu's aggregates, and a failure is an empty map
    // rather than a menu that does not load (issue #1113).
    void this.service.loadStats();
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Menu',
    });
  }
}
