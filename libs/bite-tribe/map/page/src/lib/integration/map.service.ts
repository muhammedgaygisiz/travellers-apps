import { inject, Injectable, Signal } from '@angular/core';
import { MapDataAccessService } from 'bite-tribe/map-data-access';
import { NavController } from '@ionic/angular/standalone';
import type { Bite, Geopoint, LikeClick } from 'model';
import { BiteTrailDataAccessService } from 'bite-tribe/bite-trail-data-access';

@Injectable({ providedIn: 'root' })
export class MapService {
  dataAccess = inject(MapDataAccessService);
  private readonly biteTrailDataAccess = inject(BiteTrailDataAccessService);
  private readonly navController = inject(NavController);

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
   */
  refresh(): void {
    this.dataAccess.reloadGPSPosition();
  }

  likeButtonClicked(likeClick: LikeClick): void {
    this.dataAccess.submitLikeClick(likeClick);
  }

  biteClicked(bite: Bite): void {
    this.navController.navigateForward(['bite', bite.id]);
  }
}
