import { inject, Injectable, signal } from '@angular/core';
import { Login, StoreService } from 'utils';
import { fromAuth } from 'ta-firestore';
import { Store } from '@ngrx/store';

@Injectable()
export class BiteTribeStoreService implements StoreService {
  store = inject(Store, { optional: true });

  loginFailed = signal(false);

  registrationError = signal('Not implemented yet.');

  loginWithGoogleAccount(): void {
    throw new Error('Method not implemented.');
  }

  login(authCreds: Login): void {
    this.store?.dispatch(fromAuth.login({ authCreds }));
  }

  // eslint-disable-next-line no-unused-vars
  register(authCreds: Login): void {
    throw new Error('Method not implemented.');
  }

  confirmError(): void {
    throw new Error('Method not implemented.');
  }
}
