import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonImg,
} from '@ionic/angular/standalone';
import { Bite, Menu, MenuItem, Restaurant } from 'model';
import { ToMetricPipe } from 'distance-pipe';
import { MapComponent } from 'bite-tribe-common/map';
import { BiteComponent } from 'bite-tribe-common/bite';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'restaurant',
  templateUrl: 'restaurant.component.html',
  styleUrl: './restaurant.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonImg,
    ToMetricPipe,
    IonButton,
    IonIcon,
    MapComponent,
    BiteComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantComponent {
  bite = input<Bite>();
  bites = input<Bite[]>();
  userId = input<string>();
  restaurant = input<Restaurant>();
  menu = input<Menu>();

  createBiteClick = output<MenuItem>();
  showMenuClick = output<Restaurant | undefined>();
  readonly biteClick = output<Bite>();

  placeName = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();

    return restaurant?.name || bite?.place;
  });

  placeDistance = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();

    const restaurantDistance = restaurant?.distance;
    if (restaurantDistance && restaurantDistance !== 'NaN') {
      return restaurantDistance;
    }

    return bite?.distance;
  });

  position = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();

    return restaurant?.position || bite?.position || null;
  });
}
