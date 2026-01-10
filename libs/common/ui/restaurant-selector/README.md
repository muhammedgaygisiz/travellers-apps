# restaurant-selector

Restaurant selector component with type-ahead search functionality for filtering restaurants from nearby bites.

## Usage

The component can be used in a modal to provide a searchable restaurant selection interface.

```typescript
import { RestaurantSelectorComponent } from 'restaurant-selector';
import { IonModal } from '@ionic/angular/standalone';

// In your component template:
<ion-modal trigger="restaurant-trigger" #restaurantModal>
  <ng-template>
    <lib-restaurant-selector
      class="ion-page"
      [restaurants]="nearbyRestaurants"
      [selectedRestaurant]="selectedRestaurant"
      (restaurantSelected)="onRestaurantSelected($event, restaurantModal)"
      (selectionCancel)="restaurantModal.dismiss()"
    />
  </ng-template>
</ion-modal>

// In your component class:
onRestaurantSelected(restaurantName: string, modal: IonModal): void {
  // Handle the selected restaurant name
  modal.dismiss();
}
```

## Features

- Type-ahead search: Filter restaurants by name
- Fuzzy matching: Uses smart similarity scoring to find matching restaurants
- Custom text: If no match found, user can enter custom restaurant name
- Nearby filtering: Shows restaurants from bites within 1km radius
- Accessible: Follows Ionic's accessibility guidelines

## Inputs

- `restaurants` (string[]): List of restaurant names from nearby bites
- `selectedRestaurant` (string): The currently selected restaurant name

## Outputs

- `restaurantSelected`: Emits the selected restaurant name when user selects or enters a restaurant
- `selectionCancel`: Emits when user cancels the selection
