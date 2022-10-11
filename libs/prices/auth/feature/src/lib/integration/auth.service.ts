import { AuthCredentials } from '../api/auth-credentials';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { fromAuth } from '@travellers-apps/prices/store/feature';
import { Observable } from 'rxjs';

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

  public login(event: AuthCredentials): void {
    this.store.dispatch(
      fromAuth.login({
        authCreds: {
          email: event.email as unknown as string,
          password: event.password as unknown as string,
        },
      })
    );
  }
}
