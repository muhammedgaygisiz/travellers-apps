import { inject, Injectable, Signal } from '@angular/core';
import { MapDataAccessService } from 'bite-tribe/map-data-access';
import { AlertController, NavController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import type { Bite, Geopoint, LikeClick } from 'model';
import { BiteTrailDataAccessService } from 'bite-tribe/bite-trail-data-access';

@Injectable({ providedIn: 'root' })
export class MapService {
  dataAccess = inject(MapDataAccessService);
  private readonly biteTrailDataAccess = inject(BiteTrailDataAccessService);
  private readonly navController = inject(NavController);
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  bites = this.dataAccess.bites;
  bitesBySelectedBucketlist = this.dataAccess.bitesBySelectedBucketlist;
  bitesByBiteTrail = this.biteTrailDataAccess.bitesWithDistance;
  myBites = this.dataAccess.myBites;
  isAuthenticated = this.dataAccess.isAuthenticated;

  selectedBucketlist = this.dataAccess.selectedBucketlist;

  gpsPosition: Signal<Geopoint | null | undefined> =
    this.dataAccess.gpsPosition;
  userId = this.dataAccess.userId;

  logout(): void {
    this.dataAccess.logout();
  }

  /**
   * Reloads the GPS position, which re-fetches nearby bites. Mirrors the
   * pull-to-refresh behavior on the home feed for the map's "my position"
   * button.
   *
   * The map has no error card to fall back on, so a blocked read here used to
   * do nothing at all: the button was the reproduction path in issue #1183.
   * The permission is settled before the read so the user either gets their
   * position or an explanation with the one action that can restore it.
   */
  async refresh(): Promise<void> {
    const isBlocked = await this.settleLocationPermission();

    this.dataAccess.reloadGPSPosition();

    if (isBlocked) {
      await this.presentLocationDeniedAlert();
    }
  }

  /**
   * Resolves the OS state into the two outcomes the caller cares about, and
   * reports whether location stays blocked.
   *
   * `prompt` still has an unspent OS prompt, and the user just asked for their
   * own position, so asking is in context. `denied` cannot be re-asked at all —
   * the OS ignores further requests — which is why it takes the settings route
   * instead. `unsupported` is the web build, where the browser asks on read.
   */
  private async settleLocationPermission(): Promise<boolean> {
    const state = await this.dataAccess.getLocationPermissionState();

    if (state === 'prompt') {
      return (await this.dataAccess.requestLocationPermission()) === 'denied';
    }

    return state === 'denied';
  }

  private async presentLocationDeniedAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.transloco.translate('location-permission-denied-title'),
      message: this.transloco.translate('location-permission-denied'),
      buttons: [
        {
          text: this.transloco.translate('cancel'),
          role: 'cancel',
        },
        {
          text: this.transloco.translate('open-location-settings-confirm'),
          role: 'confirm',
          handler: (): void => {
            void this.dataAccess.openLocationSettings();
          },
        },
      ],
    });

    await alert.present();
  }

  likeButtonClicked(likeClick: LikeClick): void {
    this.dataAccess.submitLikeClick(likeClick);
  }

  biteClicked(bite: Bite): void {
    this.navController.navigateForward(['bite', bite.id]);
  }
}
