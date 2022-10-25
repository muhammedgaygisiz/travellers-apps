import { Injectable } from '@angular/core';
import { AuthCredentials } from '@travellers-apps/utils-common';
import { Store } from '@ngrx/store';

@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly store: Store
  ) {}

  public register(registration: AuthCredentials): void {
    //TODO: Here comes the ngrx part ...
    this.store.dispatch({
      type: 'Registration',
      registration,
    } as any);
  }
}
