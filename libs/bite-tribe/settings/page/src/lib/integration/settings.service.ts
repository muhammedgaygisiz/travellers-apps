import { inject, Injectable } from '@angular/core';
import { SettingsDataAccessService } from 'bite-tribe/settings-data-access';
import { Settings } from 'model';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  dataAccess = inject(SettingsDataAccessService);

  user = this.dataAccess.user;

  saveSettings(settings: Settings) {
    this.dataAccess.saveSettings(settings);
  }
}
