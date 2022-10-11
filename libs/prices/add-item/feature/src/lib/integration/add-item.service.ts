import { Injectable } from '@angular/core';
import {
  fromLocation,
  fromMostSearched,
} from '@travellers-apps/prices/store/feature';
import { Store } from '@ngrx/store';
import { Price } from '@travellers-apps/utils-common';

@Injectable({
  providedIn: 'root',
})
export class AddItemService {
  location$ = this.store.select(fromLocation.selectLocation);

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly store: Store
  ) {}

  saveItem(price: Price) {
    this.store.dispatch(
      fromMostSearched.saveItem({
        item: price,
      })
    );
  }
}
