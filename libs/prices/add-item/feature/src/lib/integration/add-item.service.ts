import { inject, Injectable } from '@angular/core';
import {
  fromLocalization,
  fromLocation,
  fromMostSearched,
} from '@travellers-apps/prices/store/feature';
import { Store } from '@ngrx/store';
import { Price } from '../api/price.model';
import { SupportedLang } from '@travellers-apps/prices/localization';

@Injectable({
  providedIn: 'root',
})
export class AddItemService {
  private readonly store = inject(Store);

  location$ = this.store.select(fromLocation.selectLocation);

  saveItem(price: Price) {
    this.store.dispatch(
      fromMostSearched.saveItem({
        item: price,
      })
    );
  }

  changeLanguage(event: SupportedLang) {
    this.store.dispatch(fromLocalization.changeLanguage({ lang: event }));
  }
}
