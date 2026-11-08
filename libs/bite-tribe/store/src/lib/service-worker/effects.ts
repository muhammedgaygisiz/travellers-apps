import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType, rootEffectsInit } from '@ngrx/effects';
import { switchMap, tap } from 'rxjs';
import { SwUpdate } from '@angular/service-worker';
import { AlertController, Platform } from '@ionic/angular/standalone';

@Injectable()
export class ServiceWorkerEffects {
  private readonly actions$ = inject(Actions);
  private readonly updates = inject(SwUpdate);
  private readonly document = inject(DOCUMENT);

  private readonly platform = inject(Platform);
  private readonly alertController = inject(AlertController);

  private updateAlert: HTMLIonAlertElement | undefined;
  private applyingUpdate = false;

  swUpdateEffect$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(rootEffectsInit),
        switchMap(() => {
          return this.updates.versionUpdates.pipe(
            tap(async (evt) => {
              console.log('Service Worker event:', evt);

              if (this.platform.is('hybrid')) {
                return;
              }

              switch (evt.type) {
                case 'VERSION_DETECTED':
                  console.log('Version detected:', evt.version);

                  this.updateAlert = await this.alertController.create({
                    header: 'App Update Available',
                    message: `A new version of the app is available. Please wait while we download it for you in the background.`,
                    backdropDismiss: false,
                    buttons: ['OK'],
                  });

                  await this.updateAlert.present();
                  break;
                case 'VERSION_READY': {
                  console.log(
                    'Version ready for use:',
                    evt.currentVersion,
                    evt.latestVersion,
                  );

                  this.updateAlert?.dismiss();

                  // Nobody can click a dialog in a background tab, so it would
                  // keep running the old build for as long as it stays open.
                  // See GitHub issue #1904.
                  if (this.document.visibilityState === 'hidden') {
                    this.applyUpdate();
                    break;
                  }

                  await this.presentReadyAlert();
                  break;
                }
                case 'VERSION_INSTALLATION_FAILED':
                  console.log(
                    `Failed to install app version: '${evt.version.hash}': ${evt.error}`,
                  );
                  break;
                case 'NO_NEW_VERSION_DETECTED':
                  console.log('App is up to date:', evt.version.hash);
                  break;
                default: {
                  console.log('Unhandled event type:', evt);
                  break;
                }
              }
            }),
          );
        }),
      );
    },
    { dispatch: false },
  );

  private async presentReadyAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'App Update Ready',
      message:
        'The app has been updated to the latest version. We will now refresh to apply the update.',
      backdropDismiss: false,
      buttons: [
        {
          text: 'Restart Now',
          handler: (): void => this.applyUpdate(),
        },
      ],
    });

    // A tab the member leaves while the dialog is up would otherwise wait
    // behind it until they come back.
    const onVisibilityChange = (): void => {
      if (this.document.visibilityState === 'hidden') {
        this.applyUpdate();
      }
    };
    this.document.addEventListener('visibilitychange', onVisibilityChange);
    void alert.onDidDismiss().then(() => {
      this.document.removeEventListener('visibilitychange', onVisibilityChange);
    });

    await alert.present();
  }

  private applyUpdate(): void {
    if (this.applyingUpdate) {
      return;
    }
    this.applyingUpdate = true;

    this.updates
      .activateUpdate()
      .catch((error) => {
        console.error('Failed to activate update:', error);
      })
      .finally(() => {
        this.document.location.reload();
      });
  }
}
