import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonContent, IonImg } from '@ionic/angular/standalone';
import type { Menu, Restaurant } from 'model';
import { BusinessMenuComponent } from '../business-menu/business-menu.component';

@Component({
  selector: 'edit-menu-page',
  templateUrl: 'edit-menu-page.component.html',
  styleUrl: 'edit-menu-page.component.scss',
  imports: [PageComponent, IonContent, IonImg, BusinessMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditMenuPage {
  restaurant = input<Restaurant>();

  menu = input<Menu>();

  saveMenu = output<Menu>();

  placeName = computed(() => this.restaurant()?.name);
}
