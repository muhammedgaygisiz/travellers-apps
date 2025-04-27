import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { Geolocation } from '@capacitor/geolocation';

@Injectable({ providedIn: 'root' })
export class BiteDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  async submitNewBite(newBite: any) {
    const currentPosition = await this.getCurrentPosition();

    const enrichedBite = {
      ...newBite,
      position: {
        _latitude: currentPosition.coords.latitude,
        _longitude: currentPosition.coords.longitude,
      },
    };

    this.storeService.save(enrichedBite, 'bite');
  }

  private async getCurrentPosition() {
    const permissionStatus = await Geolocation.checkPermissions();

    if (permissionStatus.location !== 'granted') {
      await Geolocation.requestPermissions();
    }

    return await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 5000,
    });
  }
}
