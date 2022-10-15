import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  fromAuth,
  fromLocation,
  fromMostSearched,
} from '@travellers-apps/prices/store/feature';
import { map, mergeMap } from 'rxjs';
import { NavController } from '@ionic/angular';

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
    private readonly store: Store,
    // eslint-disable-next-line no-unused-vars
    private readonly navController: NavController
  ) {}

  public loadMostSearchedEntries(): void {
    this.store.dispatch(fromMostSearched.loadItems());
  }

  public logout(): void {
    this.store.dispatch(fromAuth.logout());
  }

  public async onAddItemClick() {
    await this.navController.navigateForward(['/add-item']);
  }

  public async onLoginClick() {
    await this.navController.navigateForward(['/login']);
  }
}
