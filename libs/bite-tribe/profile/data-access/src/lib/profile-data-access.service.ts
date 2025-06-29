import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';

@Injectable({ providedIn: 'root' })
export class ProfileDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });

  biteCreator = toSignal(this.storeService.biteCreator$);

  logout() {
    this.storeService.logout();
  }
}
