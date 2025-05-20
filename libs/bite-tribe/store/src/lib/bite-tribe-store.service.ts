import { inject, Injectable, signal } from '@angular/core';
import { Login, StoreService } from 'utils';
import { fromAuth } from 'ta-firestore';
import { createAction, props, Store } from '@ngrx/store';
import { saveNewBite, saveTags } from './bites/actions';
import { saveNewReview } from './reviews/actions';
import { bite, bites } from './bites/selectors';
import {
  restaurant,
  restaurants,
  restaurantToCreate,
} from './restaurants/selectors';
import { menu } from './menus/selectors';
import { saveSettings } from './app/actions';
import { reviews } from './reviews/selectors';
import { toSignal } from '@angular/core/rxjs-interop';
import { Restaurant, Settings } from 'model';
import { currency, settings } from './app/selectors';
import { removeLike, saveLike } from './likes/actions';
import { setRestaurantToCreate } from './restaurants/actions';

const unknownEntity = createAction(
  '[Unknown Entity]',
  props<{ docType: string }>()
);

const getActionByDocType = (docType: string, entity: any) => {
  switch (docType) {
    case 'bite': {
      return saveNewBite({ bite: entity });
    }
    default: {
      return unknownEntity({ docType });
    }
  }
};

@Injectable({
  providedIn: 'root',
})
export class BiteTribeStoreService implements StoreService {
  store = inject(Store);

  loginFailed = toSignal(this.store.select(fromAuth.selectLoginFailed), {
    initialValue: false,
  });

  registrationError = signal('Not implemented yet.');

  bites$ = this.store.select(bites);
  bite$ = this.store.select(bite);
  restaurant$ = this.store.select(restaurant);
  restaurants$ = this.store.select(restaurants);
  menu$ = this.store.select(menu);
  reviews$ = this.store.select(reviews);
  currencyFromSettings$ = this.store.select(currency);
  restaurantToCreate$ = this.store.select(restaurantToCreate);

  userId = this.store.select(fromAuth.selectUserId);
  user$ = this.store.select(fromAuth.selectUser);
  settings$ = this.store.select(settings);

  loginWithGoogleAccount(): void {
    this.store.dispatch(fromAuth.loginWithGoogleAccount());
  }

  loginWithAppleAccount(): void {
    this.store.dispatch(fromAuth.loginWithAppleAccount());
  }

  loginWithFacebookAccount(): void {
    this.store.dispatch(fromAuth.loginWithFacebookAccount());
  }

  login(authCreds: Login): void {
    this.store?.dispatch(fromAuth.login({ authCreds }));
  }

  register(registration: Login): void {
    this.store?.dispatch(fromAuth.register({ registration }));
  }

  confirmError(): void {
    throw new Error('Method not implemented.');
  }

  save(entity: any, docType: string): void {
    this.store?.dispatch(getActionByDocType(docType, entity));
  }

  saveTags(newTagsArray: string[], id: string) {
    this.store.dispatch(
      saveTags({
        newTags: newTagsArray,
        id,
      })
    );
  }

  logout() {
    this.store?.dispatch(fromAuth.logout());
  }

  submitLikeClick(event: { likeType: string; biteId: string }) {
    this.store?.dispatch(
      saveLike({
        ...event,
        createdAt: new Date().toISOString(),
      })
    );
  }

  removeLike(event: { likeType: string; biteId: string }) {
    this.store?.dispatch(removeLike({ like: event }));
  }

  saveSettings(settings: Settings) {
    this.store.dispatch(saveSettings({ settings }));
  }

  saveReview(newReview: { review: string; biteId: string }) {
    this.store.dispatch(saveNewReview(newReview));
  }

  selectRestaurantToCreate(restaurant: Restaurant) {
    this.store.dispatch(setRestaurantToCreate({ restaurant }));
  }
}
