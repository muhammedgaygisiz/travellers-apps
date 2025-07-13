import { ErrorHandler, inject, Injectable } from '@angular/core';
import { AuthService } from 'ta-firestore';
import {
  BehaviorSubject,
  skip,
  skipWhile,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { Settings } from 'model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

const SETTINGS_COLLECTION = 'settings';

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  private readonly authService = inject(AuthService);
  private readonly errorHandler = inject(ErrorHandler);

  private readonly stopped$ = new Subject<void>();

  private readonly settingsChannel$ = new BehaviorSubject<Settings>(
    {} as Settings
  );

  public settings$ = this.authService.isLoggedIn$.pipe(
    skipWhile((isLoggedIn) => !isLoggedIn),
    switchMap(() => {
      // console.debug('#mo - Start Listener for Settings');
      this.startSettingsListener();

      return this.settingsChannel$.pipe(skip(1), takeUntil(this.stopped$));
    })
  );

  private async startSettingsListener() {
    const user = await this.getUser();

    await FirebaseFirestore.addDocumentSnapshotListener(
      { reference: `${SETTINGS_COLLECTION}/${user?.uid}` },
      async (settingsDoc) => {
        // console.debug('#mo Fetched settings from Firestore', settingsDoc);

        const settings = settingsDoc?.snapshot.data as any;
        this.settingsChannel$.next(settings);
      }
    );
  }

  private async getUser() {
    const authState = await this.authService.authState();
    return authState?.user;
  }

  async saveSettings(settings: any) {
    try {
      const user = await this.getUser();
      if (!user?.uid) {
        throw new Error('No user logged in');
      }

      await FirebaseFirestore.setDocument({
        reference: `${SETTINGS_COLLECTION}/${user.uid}`,
        data: {
          ...settings,
          updatedAt: new Date().toISOString(),
        },
      });

      // console.debug('#mo', updateDocumentResult);
    } catch (error) {
      console.error('Error saving settings:', error);
      this.errorHandler.handleError(error);
      throw error;
    }
  }
}
