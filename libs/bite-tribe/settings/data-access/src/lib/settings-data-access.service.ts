import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { PublicUser, Settings } from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';

@Injectable({
  providedIn: 'root',
})
export class SettingsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);

  user = toSignal(this.storeService.user$);
  settings = toSignal(this.storeService.settings$);
  publicUser = toSignal(this.storeService.publicUser$);

  saveSettings(settings: Settings): void {
    this.api.saveSettings(settings);

    this.storeService.notifySavedSettings(settings);
  }
}
