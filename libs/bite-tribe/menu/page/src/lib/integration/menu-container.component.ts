import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
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
      [dietaryVotes]="service.dietaryVotes()"
      (dietaryVoteClick)="service.voteDietaryLabel($event)"
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
export class MenuContainer {
  service = inject(MenuService);

  /** Keyed on the id, so a restaurant document that changes in place is not read again. */
  private readonly restaurantId = computed(() => this.service.restaurant()?.id);

  constructor() {
    // One read for the whole menu's aggregates, and a failure is an empty map
    // rather than a menu that does not load (issue #1113). Read once the
    // restaurant is known rather than on init: a menu opened by link or
    // reload initialises before its restaurant has loaded, and an init-time
    // read found no id and showed no ratings at all (issue #2309).
    effect(() => {
      const restaurantId = this.restaurantId();

      if (restaurantId) {
        untracked(() => {
          void this.service.loadStats();
          void this.service.loadOwnDietaryVotes();
        });
      }
    });
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Menu',
    });
  }
}
