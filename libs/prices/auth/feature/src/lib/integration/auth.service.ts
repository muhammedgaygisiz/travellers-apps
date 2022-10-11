import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { fromAuth } from '@travellers-apps/prices/store/feature';
import { Observable } from 'rxjs';
import { AuthCredentials } from '@travellers-apps/utils-common';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  public loginFailed$: Observable<boolean> = this.store.select(
    fromAuth.selectLoginFailed
  );

  constructor(
    // eslint-disable-next-line no-unused-vars
    private store: Store
  ) {}

  public login(authCreds: AuthCredentials): void {
    this.store.dispatch(fromAuth.login({ authCreds }));
  }
}
