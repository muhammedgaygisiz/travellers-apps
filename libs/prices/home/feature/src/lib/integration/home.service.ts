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

  public loadMostSearchedEntries(): void {
    this.store.dispatch(fromMostSearched.loadItems());
  }

  public logout(): void {
    this.store.dispatch(fromAuth.logout());
  }
}
