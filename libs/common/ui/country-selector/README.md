# country-selector

Country selector component with type-ahead search for picking one ISO 3166-1
alpha-2 country.

## Usage

The component is meant to be used inside a modal, the same way
`currency-selector` is.

```typescript
import { CountrySelectorComponent } from 'country-selector';
import { IonModal } from '@ionic/angular/standalone';

// In your component template:
<ion-modal trigger="country-trigger" #countryModal>
  <ng-template>
    <country-selector
      class="ion-page"
      [selectedCountry]="selectedCountry"
      (countrySelected)="onCountrySelected($event, countryModal)"
      (selectionCancel)="countryModal.dismiss()"
    />
  </ng-template>
</ion-modal>

// In your component class:
onCountrySelected(countryCode: string, modal: IonModal): void {
  // Handle the selected alpha-2 country code
  modal.dismiss();
}
```

## Features

- Type-ahead search: filter countries by localized name or alpha-2 code
- Fuzzy matching: uses the shared similarity scoring, so typos still match
- Localized: names come from `Intl.DisplayNames`, sorted with `Intl.Collator`
  in the active language, so the list reads alphabetically for every user
- Flags: rectangular `flag-icons` flag per row
- Accessible: every row carries an aria-label that says what the tap does

## Inputs

- `selectedCountry` (string | undefined): currently selected alpha-2 code
- `leftButtonLangCode` (string): Transloco key for the left toolbar button
  (default: `cancel`)

## Outputs

- `countrySelected`: emits the selected alpha-2 country code
- `selectionCancel`: emits when the user cancels the selection
