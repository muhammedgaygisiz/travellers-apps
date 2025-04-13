import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { fromAuth } from '@travellers-apps/prices/store/feature';
import { Credentials } from '../../api/credentials.model';

@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  private readonly store = inject(Store);

  errorCode$ = this.store.select(fromAuth.selectRegistrationErrorCode);

  public register(registration: Credentials): void {
    this.store.dispatch(fromAuth.register({ registration }));
  }

  confirmError() {
    this.store.dispatch(fromAuth.confirmRegistrationErrorMessage());
  }
}
