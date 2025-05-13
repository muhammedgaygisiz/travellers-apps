import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class SettingsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  user = toSignal(this.storeService.user$, { initialValue: {} });
}
