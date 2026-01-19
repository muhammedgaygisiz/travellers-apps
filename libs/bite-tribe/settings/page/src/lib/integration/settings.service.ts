import { inject, Injectable } from '@angular/core';
import { SettingsDataAccessService } from 'bite-tribe/settings-data-access';
import { Settings } from 'model';
import { NavController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  dataAccess = inject(SettingsDataAccessService);
  private readonly navController = inject(NavController);

  user = this.dataAccess.user;
  publicUser = this.dataAccess.publicUser;
  settings = this.dataAccess.settings;

  saveSettings(settings: Settings): void {
    this.dataAccess.saveSettings(settings);

    this.navController.navigateBack(['home']);
  }
}
