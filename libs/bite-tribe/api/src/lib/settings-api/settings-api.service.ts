import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import type { Settings } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { SETTINGS_COLLECTION } from '../utils/constants';
import { loadSettingsByUserId } from './utils/load-settings-by-user-id';

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  loadSettingsByUserId(): Promise<Settings> {
    const user = this.authService.getUser();
    const userId = user?.uid;
    if (!userId) {
      return Promise.resolve({} as Settings);
    }

    return loadSettingsByUserId(userId);
  }

  async saveSettings(settings: object): Promise<void> {
    try {
      const user = this.authService.getUser();
      if (!user?.uid) {
        return;
      }

      await FirebaseFirestore.setDocument({
        reference: `${SETTINGS_COLLECTION}/${user.uid}`,
        data: {
          ...settings,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      this.errorHandler.handleError(error);
      throw error;
    }
  }
}
