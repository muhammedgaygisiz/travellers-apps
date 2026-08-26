import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonImg,
  IonSkeletonText,
  IonText,
} from '@ionic/angular/standalone';
import type { Bite, Menu, MenuItem, Restaurant } from 'model';
import { TranslocoPipe } from '@jsverse/transloco';
import { MenuComponent } from '../menu/menu.component';

@Component({
  selector: 'menu-page',
  templateUrl: 'menu-page.component.html',
  styleUrl: 'menu-page.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonImg,
    IonSkeletonText,
    IonCard,
    IonCardContent,
    IonText,
    IonButton,
    TranslocoPipe,
    MenuComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuPage {
  bite = input<Bite>();
  restaurant = input<Restaurant>();
  menu = input<Menu>();

  /**
   * The menu has not arrived yet. The page answers with skeletons rather than
   * with its final layout, because a menu that is still loading used to be
   * indistinguishable from a restaurant that genuinely has none. See GitHub
   * issue #1382.
   */
  isMenuLoading = input(false, { transform: booleanAttribute });

  /**
   * The menu could not be resolved at all. Distinct from a loaded menu with no
   * items, which keeps the empty state it has always had (#1382).
   */
  isMenuUnavailable = input(false, { transform: booleanAttribute });

  createBiteClick = output<MenuItem>();
  readonly goBack = output();
  readonly retryLoad = output();

  placeName = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();

    return restaurant?.name || bite?.place;
  });

  /**
   * The restaurant photo, if there is one. Read here so the header can be left
   * out entirely when there is nothing to show: bound unconditionally it
   * reserved 300px for an image with no source, which read as a broken page
   * rather than as a page without a photo. See GitHub issue #1382.
   */
  imageSrc = computed(() => {
    const restaurant = this.restaurant();

    return restaurant?.imagePath || restaurant?.image;
  });
}
