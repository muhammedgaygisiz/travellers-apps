import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  fromAuth,
  fromLocation,
  fromMostSearched,
} from '@travellers-apps/prices/store/feature';
import { map, mergeMap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  mostSearched$ = this.store.select(fromMostSearched.selectAllItems).pipe(
    mergeMap((allItems) =>
      this.location$.pipe(
        map((location) => {
          if (location) {
            return allItems.filter((item) => item.location === location);
          }

          return allItems;
        })
      )
    )
  );

  isAuthenticated$ = this.store.select(fromAuth.selectIsAuthenticated);

  location$ = this.store.select(fromLocation.selectLocation);

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly store: Store
  ) {}

  public loadMostSearchedEntries(): void {
    this.store.dispatch(fromMostSearched.loadItems());
  }

  public logout(): void {
    this.store.dispatch(fromAuth.logout());
  }
}
