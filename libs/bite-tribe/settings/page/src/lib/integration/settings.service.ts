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
  isPublicProfile = this.dataAccess.isPublicProfile;

  saveSettings(settings: Settings): void {
    this.dataAccess.saveSettings(settings);

    this.navController.navigateBack(['home']);
  }

  goPublic(): void {
    this.dataAccess.goPublic();
  }

  goPrivate(): void {
    this.dataAccess.goPrivate();
  }

  saveProfile(publicUser: PublicUser): void {
    this.dataAccess.savePublicProfile(publicUser);
  }
}
