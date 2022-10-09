import { Injectable } from '@angular/core';
import {
  fromLocation,
  fromMostSearched,
} from '@travellers-apps/prices/store/feature';
import { Store } from '@ngrx/store';
import { AddItem } from '../api/add-item';

@Injectable({
  providedIn: 'root',
})
export class AddItemService {
  location$ = this.store.select(fromLocation.selectLocation);

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly store: Store
  ) {}

  saveItem(addItem: AddItem) {
    this.store.dispatch(
      fromMostSearched.saveItem({
        item: {
          productName: addItem.productName as unknown as string,
          price: addItem.price as unknown as number,
          src: addItem.src as unknown as string,
          location: addItem.location as unknown as string,
        },
      })
    );
  }
}
