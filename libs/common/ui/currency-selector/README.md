# currency-selector

Currency selector component with type-ahead search functionality for filtering currencies.

## Usage

The component can be used in a modal to provide a searchable currency selection interface.

```typescript
import { CurrencySelectorComponent } from 'currency-selector';
import { IonModal } from '@ionic/angular/standalone';

// In your component template:
<ion-modal trigger="currency-trigger" #currencyModal>
  <ng-template>
    <currency-selector
      class="ion-page"
      [selectedCurrency]="selectedCurrency"
      (currencySelected)="onCurrencySelected($event, currencyModal)"
      (selectionCancel)="currencyModal.dismiss()"
    />
  </ng-template>
</ion-modal>

// In your component class:
onCurrencySelected(currencyCode: string, modal: IonModal): void {
  // Handle the selected currency code
  modal.dismiss();
}
```

## Features

- Type-ahead search: Filter currencies by name or code
- Fuzzy matching: Uses smart similarity scoring to find matching currencies
- Visual feedback: Shows checkmark for currently selected currency
- Accessible: Follows Ionic's accessibility guidelines

## Inputs

- `selectedCurrency` (string): The currently selected currency code (default: 'EUR')

## Outputs

- `currencySelected`: Emits the selected currency code when user selects a currency
- `selectionCancel`: Emits when user cancels the selection
