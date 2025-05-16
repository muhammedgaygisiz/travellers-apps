import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonContent, IonImg } from '@ionic/angular/standalone';
import { Bite, Menu, Restaurant } from 'model';
import { MenuComponent } from '../menu/menu.component';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'menu-page',
  templateUrl: 'menu-page.component.html',
  styleUrl: 'menu-page.component.scss',
  imports: [PageComponent, IonContent, IonImg, MenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class MenuPage {
  bite = input<Bite>();
  restaurant = input<Restaurant>();
  menu = input<Menu>();

  placeName = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();

    return restaurant?.name || bite?.place;
  });
}
