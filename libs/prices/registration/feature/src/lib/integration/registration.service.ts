import { inject, Injectable } from '@angular/core';
import { AuthCredentials } from '@travellers-apps/utils-common';
import { Store } from '@ngrx/store';
import { fromAuth } from '@travellers-apps/prices/store/feature';

@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  private readonly store = inject(Store);

  errorCode$ = this.store.select(fromAuth.selectRegistrationErrorCode);

  public register(registration: AuthCredentials): void {
    this.store.dispatch(fromAuth.register({ registration }));
  }

  confirmError() {
    this.store.dispatch(fromAuth.confirmRegistrationErrorMessage());
  }
}
