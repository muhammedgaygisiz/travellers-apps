import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { fromAuth } from 'ta-firestore';
import {
  fromLocation,
  fromMostSearched,
  fromLocalization,
} from '@travellers-apps/prices/store/feature';
import { NavController } from '@ionic/angular';
import { SupportedLang } from 'localization';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  private readonly store = inject(Store);
  private readonly navController = inject(NavController);

  mostSearched$ = this.store.select(fromMostSearched.selectAllItems);

  isAuthenticated$ = this.store.select(fromAuth.selectIsAuthenticated);

  location$ = this.store.select(fromLocation.selectLocation);

  public loadMostSearchedEntries(): void {
    this.store.dispatch(fromMostSearched.loadItems());
  }

  public logout(): void {
    this.store.dispatch(fromAuth.logout());
  }

  public async onAddItemClick(): Promise<void> {
    await this.navController.navigateForward(['/add-item']);
  }

  public async onLoginClick(): Promise<void> {
    await this.navController.navigateForward(['/login']);
  }

  changeLanguage(event: SupportedLang): void {
    this.store.dispatch(fromLocalization.changeLanguage({ lang: event }));
  }
}
