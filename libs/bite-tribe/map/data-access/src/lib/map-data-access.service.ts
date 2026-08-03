import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Bite, LikeClick } from 'model';
import {
  getLocationPermissionState,
  openLocationSettings,
  requestLocationPermission,
  type LocationPermissionResult,
  type LocationPermissionState,
} from 'geolocation';

@Injectable({
  providedIn: 'root',
})
export class MapDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  bites = toSignal(this.storeService.bites$, { initialValue: [] as Bite[] });
  bitesBySelectedBucketlist = toSignal(
    this.storeService.bitesBySelectedBucketlist$,
    {
      initialValue: [] as Bite[],
    },
  );
  myBites = toSignal(this.storeService.sortedMyBites$, {
    initialValue: [] as Bite[],
  });
  userId = toSignal(this.storeService.userId$, { initialValue: '' });
  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });
  selectedBucketlist = toSignal(this.storeService.selectedBucketlist$, {
    requireSync: true,
  });
  gpsPosition = toSignal(this.storeService.position$);

  logout(): void {
    this.storeService.logout();
  }

  reloadGPSPosition(): void {
    this.storeService.reloadGPSPosition();
  }

  submitLikeClick(likeClick: LikeClick): void {
    this.storeService.submitLikeClick(likeClick);
  }

  getLocationPermissionState(): Promise<LocationPermissionState> {
    return getLocationPermissionState();
  }

  requestLocationPermission(): Promise<LocationPermissionResult> {
    return requestLocationPermission();
  }

  openLocationSettings(): Promise<boolean> {
    return openLocationSettings();
  }
}
