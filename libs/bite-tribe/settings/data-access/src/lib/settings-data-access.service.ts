import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Settings } from 'model';

@Injectable({
  providedIn: 'root',
})
export class SettingsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  user = toSignal(this.storeService.user$);
  settings = toSignal(this.storeService.settings$);

  saveSettings(settings: Settings) {
    this.storeService.saveSettings(settings);
  }
}
