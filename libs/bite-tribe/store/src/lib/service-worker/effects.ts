import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType, rootEffectsInit } from '@ngrx/effects';
import { switchMap, tap } from 'rxjs';
import { SwUpdate } from '@angular/service-worker';
import { Platform } from '@ionic/angular/standalone';
import { AppUpdateService } from 'utils';

@Injectable()
export class ServiceWorkerEffects {
  private readonly actions$ = inject(Actions);
  private readonly updates = inject(SwUpdate);
  private readonly document = inject(DOCUMENT);

  private readonly platform = inject(Platform);
  private readonly appUpdate = inject(AppUpdateService);

  private applyingUpdate = false;

  swUpdateEffect$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(rootEffectsInit),
        switchMap(() => {
          return this.updates.versionUpdates.pipe(
            tap((evt) => {
              console.log('Service Worker event:', evt);

              if (this.platform.is('hybrid')) {
                return;
              }

              switch (evt.type) {
                case 'VERSION_DETECTED':
                  // Downloads in the background. Nothing to tell the member
                  // until it is ready (issue #2135).
                  console.log('Version detected:', evt.version);
                  break;
                case 'VERSION_READY': {
                  console.log(
                    'Version ready for use:',
                    evt.currentVersion,
                    evt.latestVersion,
                  );

                  // Nobody looks at a background tab, so it would keep running
                  // the old build for as long as it stays open.
                  // See GitHub issue #1904.
                  if (this.document.visibilityState === 'hidden') {
                    this.applyUpdate();
                    break;
                  }

                  this.announceUpdate();
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

  /**
   * Offers the ready version in the menu instead of a dialog: a badge on the
   * menu button and a row that loads it on tap. The member reloads when it
   * suits them (issue #2135).
   */
  private announceUpdate(): void {
    this.appUpdate.announce(() => this.applyUpdate());

    // A tab the member leaves while an update waits applies it then, so it
    // does not stay on the old build until they come back (issue #1904).
    const onVisibilityChange = (): void => {
      if (this.document.visibilityState === 'hidden') {
        this.document.removeEventListener(
          'visibilitychange',
          onVisibilityChange,
        );
        this.applyUpdate();
      }
    };
    this.document.addEventListener('visibilitychange', onVisibilityChange);
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
