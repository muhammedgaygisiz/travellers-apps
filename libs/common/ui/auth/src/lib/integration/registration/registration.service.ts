import { inject, Injectable } from '@angular/core';
import { Credentials } from '../../api/credentials.model';
import { STORE_SERVICE } from 'utils';

@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  private store = inject(STORE_SERVICE);

  public registrationError = this.store.registrationError;

  public register(registration: Credentials): void {
    this.store.register(registration);
  }

  confirmError(): void {
    this.store.confirmError();
  }
}
