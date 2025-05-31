import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RestaurantComponent } from '../components/page/restaurant.component';
import { RestaurantService } from './restaurant.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <restaurant
      class="ion-page"
      [bite]="service.bite()"
      [bites]="service.bites()"
      [userId]="service.userId()"
      [restaurant]="service.restaurant()"
      (showMenuClick)="service.navigateToMenu($event)"
    />
  `,
  imports: [RestaurantComponent],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class RestaurantContainer {
  service = inject(RestaurantService);
}
