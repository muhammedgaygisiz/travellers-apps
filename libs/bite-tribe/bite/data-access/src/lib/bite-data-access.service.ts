import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { Geolocation } from '@capacitor/geolocation';
import { GeoPoint } from 'firebase/firestore';
import { Platform } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class BiteDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly platform = inject(Platform);

  async submitNewBite(newBite: any) {
    const currentPosition = await this.getCurrentPosition();

    const enrichedBite = {
      ...newBite,
      position: new GeoPoint(
        currentPosition.coords.latitude,
        currentPosition.coords.longitude
      ),
    };

    this.storeService.save(enrichedBite, 'bite');
  }

  private async getCurrentPosition() {
    if (this.platform.is('capacitor')) {
      return await this.getGeoLocationFromNativePlatform();
    }

    return await this.getGeoLocationFromWebPlatform();
  }

  private async getGeoLocationFromNativePlatform() {
    const permissionStatus = await Geolocation.checkPermissions();

    if (permissionStatus.location !== 'granted') {
      await Geolocation.requestPermissions();
    }

    return await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 5000,
    });
  }

  private async getGeoLocationFromWebPlatform(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 5000,
        }
      );
    });
  }
}
