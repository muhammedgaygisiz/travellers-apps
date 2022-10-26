import { Injectable } from '@angular/core';
import { AuthCredentials } from '@travellers-apps/utils-common';
import { Store } from '@ngrx/store';
import { fromAuth } from '@travellers-apps/prices/store/feature';

@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  errorCode$ = this.store.select(fromAuth.selectRegistrationErrorCode);

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly store: Store
  ) {}

  public register(registration: AuthCredentials): void {
    this.store.dispatch(fromAuth.register({ registration }));
  }

  confirmError() {
    this.store.dispatch(fromAuth.confirmRegistrationErrorMessage());
  }
}
