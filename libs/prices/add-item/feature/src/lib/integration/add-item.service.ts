import { inject, Injectable } from '@angular/core';
import {
  fromLocation,
  fromMostSearched,
} from '@travellers-apps/prices/store/feature';
import { Store } from '@ngrx/store';
import { Price } from '../api/price.model';

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
}
