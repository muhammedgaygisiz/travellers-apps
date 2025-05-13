import { inject, Injectable, signal } from '@angular/core';
import { Login, StoreService } from 'utils';
import { fromAuth } from 'ta-firestore';
import { createAction, props, Store } from '@ngrx/store';
import { removeLike, saveLike, saveNewBite, saveTags } from './bites/actions';
import { saveNewReview } from './reviews/actions';
import { bite, bites } from './bites/selectors';
import { restaurant } from './restaurant/selectors';
import { reviews } from './reviews/selectors';
import { toSignal } from '@angular/core/rxjs-interop';

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
  reviews$ = this.store.select(reviews);

  userId = this.store.select(fromAuth.selectUserId);
  user$ = this.store.select(fromAuth.selectUser);

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

  saveReview(newReview: { review: string; biteId: string }) {
    this.store.dispatch(saveNewReview(newReview));
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
}
