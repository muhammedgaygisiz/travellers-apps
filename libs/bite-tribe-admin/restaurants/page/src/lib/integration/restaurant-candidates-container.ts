import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RestaurantCandidates } from '../component/restaurant-candidates/restaurant-candidates';
import { RestaurantsService } from './restaurants.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RestaurantCandidates],
  template: `
    <lib-restaurant-candidates
      class="ion-page"
      [candidates]="service.candidates()"
      (candidateClick)="service.candidateClicked($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class RestaurantCandidatesContainer {
  readonly service = inject(RestaurantsService);
}
