import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { StoreService } from 'utils';
import { fromAuth } from 'ta-firestore';

interface Login {
  email: string;
  password: string;
}

@Injectable()
export class PricesStoreService implements StoreService {
  private readonly store = inject(Store);

  registrationError = toSignal(
    this.store.select(fromAuth.selectRegistrationErrorCode),
    {
      initialValue: '',
    }
  );

  loginFailed = toSignal(this.store.select(fromAuth.selectLoginFailed), {
    initialValue: false,
  });

  register(registration: Login): void {
    this.store.dispatch(fromAuth.register({ registration }));
  }

  confirmError(): void {
    this.store.dispatch(fromAuth.confirmRegistrationErrorMessage());
  }

  login(authCreds: { email: string; password: string }): void {
    this.store.dispatch(fromAuth.login({ authCreds }));
  }

  loginWithGoogleAccount() {
    this.store.dispatch(fromAuth.loginWithGoogleAccount());
  }
}
