import { inject, Injectable, signal } from '@angular/core';
import { Login, StoreService } from 'utils';
import { fromAuth } from 'ta-firestore';
import { createAction, props, Store } from '@ngrx/store';
import { saveNewBite, saveTags } from './bites/actions';
import { saveNewReview } from './reviews/actions';
import { bites, bite } from './bites/selectors';
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
  reviews$ = this.store.select(reviews);

  loginWithGoogleAccount(): void {
    this.store.dispatch(fromAuth.loginWithGoogleAccount());
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
}
