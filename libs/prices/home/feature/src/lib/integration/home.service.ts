import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  fromAuth,
  fromMostSearched,
} from '@travellers-apps/prices/store/feature';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  mostSearched$ = this.store.select(fromMostSearched.selectAllItems);

  isAuthenticated$ = this.store.select(fromAuth.selectIsAuthenticated);

  constructor(
    // eslint-disable-next-line no-unused-vars
    private store: Store
  ) {}

  loadMostSearchedEntries() {
    this.store.dispatch(fromMostSearched.loadItems());
  }
}
