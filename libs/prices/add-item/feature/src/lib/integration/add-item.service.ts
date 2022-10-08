import { Injectable } from '@angular/core';
import { fromLocation } from '@travellers-apps/prices/store/feature';
import { Store } from '@ngrx/store';

@Injectable({
  providedIn: 'root',
})
export class AddItemService {
  location$ = this.store.select(fromLocation.selectLocation);

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly store: Store
  ) {}
}
