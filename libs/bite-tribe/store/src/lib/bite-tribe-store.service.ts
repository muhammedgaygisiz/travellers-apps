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

  register(registration: Login): void {
    this.store?.dispatch(fromAuth.register({ registration }));
  }

  confirmError(): void {
    throw new Error('Method not implemented.');
  }
}
