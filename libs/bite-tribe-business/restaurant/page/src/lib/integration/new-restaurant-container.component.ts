import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NewRestaurantPageComponent } from '../components/page/new-restaurant-page.component';
import { NewRestaurantService } from './new-restaurant.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NewRestaurantPageComponent],
  template: `
    <new-restaurant-page
      class="ion-page"
      [restaurant]="service.restaurantToCreate()"
      [googlePlaces]="service.googlePlaces()"
      [googlePlacesLoading]="service.googlePlacesLoading()"
      [placeDetails]="service.placeDetails()"
      [placeDetailsLoading]="service.placeDetailsLoading()"
      (submitNewRestaurant)="service.submitNewRestaurant($event)"
      (biteClick)="service.biteClicked($event)"
      (requestPrefillPlaces)="service.searchPrefillPlaces($event)"
      (searchGooglePlaces)="service.searchGooglePlaces($event)"
      (googlePlaceSelected)="service.loadPlaceDetails($event)"
    />
  `,
})
export class NewRestaurantContainer {
  service = inject(NewRestaurantService);
}
