import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { Restaurant } from 'model';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'bt-restaurant',
  templateUrl: 'restaurant.component.html',
  styleUrl: 'restaurant.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantComponent {
  readonly restaurantClick = output<Restaurant>();
}
