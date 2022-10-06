import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  fromAuth,
  fromMostSearched,
} from '@travellers-apps/prices/store/feature';
import { from, map, Observable, tap } from 'rxjs';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  mostSearched$ = this.store.select(fromMostSearched.selectAllItems);

  isAuthenticated$ = this.store.select(fromAuth.selectIsAuthenticated);

  location$: Observable<string> = from(this.getLocation()).pipe(
    tap((geolocation) => console.log('#mo', geolocation)),
    map(() => 'Marrakesh')
  );

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly store: Store,
    // eslint-disable-next-line no-unused-vars
    private readonly geolocation: Geolocation
  ) {}

  public loadMostSearchedEntries(): void {
    this.store.dispatch(fromMostSearched.loadItems());
  }

  public logout(): void {
    this.store.dispatch(fromAuth.logout());
  }

  private getLocation() {
    return this.geolocation.getCurrentPosition();
  }
}
