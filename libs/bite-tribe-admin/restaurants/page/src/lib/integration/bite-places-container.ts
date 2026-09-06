import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BitePlaces } from '../component/bite-places/bite-places';
import { RestaurantsService } from './restaurants.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BitePlaces],
  template: `
    <lib-bite-places
      class="ion-page"
      [places]="service.places()"
      (placeClick)="service.placeClicked($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class BitePlacesContainer {
  readonly service = inject(RestaurantsService);
}
