import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { Restaurant } from 'model';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
} from '@ionic/angular/standalone';
import { ToMetricPipe } from 'distance-pipe';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'bt-restaurant',
  templateUrl: 'restaurant.component.html',
  styleUrl: 'restaurant.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonCard,
    IonCardHeader,
    IonCardContent,
    ToMetricPipe,
    IonCardTitle,
    IonButton,
  ],
})
export class RestaurantComponent {
  restaurant = input.required<Restaurant>();

  readonly restaurantClick = output<Restaurant>();
  readonly createRestaurant = output<Restaurant>();
}
