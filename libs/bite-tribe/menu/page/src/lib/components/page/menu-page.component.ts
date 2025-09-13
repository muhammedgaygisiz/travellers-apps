import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonContent, IonImg } from '@ionic/angular/standalone';
import { Bite, Menu, MenuItem, Restaurant } from 'model';
import { MenuComponent } from '../menu/menu.component';

@Component({
  selector: 'menu-page',
  templateUrl: 'menu-page.component.html',
  styleUrl: 'menu-page.component.scss',
  imports: [PageComponent, IonContent, IonImg, MenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuPage {
  bite = input<Bite>();
  restaurant = input<Restaurant>();
  menu = input<Menu>();

  editMode = input(false, { transform: booleanAttribute });

  saveMenu = output<Menu>();
  createBiteClick = output<MenuItem>();

  placeName = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();

    return restaurant?.name || bite?.place;
  });
}
