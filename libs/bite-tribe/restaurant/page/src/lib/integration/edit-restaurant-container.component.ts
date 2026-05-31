import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EditRestaurantComponent } from '../components/page/edit-restaurant/edit-restaurant.component';
import { RestaurantService } from './restaurant.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <edit-restaurant
      class="ion-page"
      [restaurant]="service.restaurant()"
      (submitSocialMediaLinks)="service.submitSocialMediaLinks($event)"
      (createMenu)="service.createMenu()"
      (editMenu)="service.gotoEditMenu($event.id, $event.menuId)"
    />
  `,
  imports: [EditRestaurantComponent],
})
export class EditRestaurantContainer {
  service = inject(RestaurantService);
}
