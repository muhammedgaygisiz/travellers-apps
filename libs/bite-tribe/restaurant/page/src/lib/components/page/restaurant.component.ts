import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonContent, IonImg } from '@ionic/angular/standalone';
import { Bite, Restaurant } from 'model';
import { ToMetricPipe } from 'distance-pipe';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'restaurant',
  templateUrl: 'restaurant.component.html',
  styleUrl: './restaurant.component.scss',
  imports: [PageComponent, IonContent, IonImg, ToMetricPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantComponent {
  bite = input<Bite>();
  restaurant = input<Restaurant>();

  placeName = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();

    return restaurant?.name || bite?.place;
  });

  placeDistance = computed(() => {
    const bite = this.bite();
    const restaurant = this.restaurant();

    return restaurant?.distance || bite?.distance;
  });
}
