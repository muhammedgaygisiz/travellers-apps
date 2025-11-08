import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType, rootEffectsInit } from '@ngrx/effects';
import { switchMap, tap } from 'rxjs';
import { SwUpdate } from '@angular/service-worker';
import { AlertController, Platform } from '@ionic/angular';

@Injectable()
export class ServiceWorkerEffects {
  private readonly actions$ = inject(Actions);
  private readonly updates = inject(SwUpdate);

  private readonly platform = inject(Platform);
  private readonly alertController = inject(AlertController);

  private updateAlert: HTMLIonAlertElement | undefined;

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

                  if (this.platform.is('hybrid')) {
                    return;
                  }

                  this.updateAlert?.dismiss();

                  const alert = await this.alertController.create({
                    header: 'App Update Ready',
                    message:
                      'The app has been updated to the latest version. We will now refresh to apply the update.',
                    backdropDismiss: false,
                    buttons: [
                      {
                        text: 'Restart Now',
                        handler: (): void => {
                          this.updates
                            .activateUpdate()
                            .then(() => {
                              document.location.reload();
                            })
                            .catch((error) => {
                              console.error(
                                'Failed to activate update:',
                                error,
                              );
                              document.location.reload();
                            });
                        },
                      },
                    ],
                  });

                  await alert.present();
                  break;
                }
                case 'VERSION_INSTALLATION_FAILED':
                  console.log(
                    `Failed to install app version: '${evt.version.hash}': ${evt.error}`,
                  );
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
}
