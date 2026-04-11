import { inject, Injectable } from '@angular/core';
import { SettingsDataAccessService } from 'bite-tribe/settings-data-access';
import { PublicUser, Settings } from 'model';
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

  async saveSettings(settings: Settings): Promise<void> {
    await this.dataAccess.saveSettings(settings);

    void this.navController.navigateBack(['home']);
  }
}
