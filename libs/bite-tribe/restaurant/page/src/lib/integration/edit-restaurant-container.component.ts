import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RestaurantComponent } from '../components/page/restaurant.component';
import { RestaurantService } from './restaurant.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <restaurant
      class="ion-page"
      editMode
      [bite]="service.bite()"
      [bites]="service.bites()"
      [userId]="service.userId()"
      [restaurant]="service.restaurant()"
      (showMenuClick)="service.navigateToMenu($event)"
      (biteClick)="service.biteClicked($event)"
      (submitSocialMediaLinks)="service.submitSocialMediaLinks($event)"
    />
  `,
  imports: [RestaurantComponent],
})
export class EditRestaurantContainer {
  service = inject(RestaurantService);
}
