import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { GeoPoint } from 'firebase/firestore';
import { Platform } from '@ionic/angular';
import { splitTags } from 'utils';
import { getCurrentPosition } from 'geolocation';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class BiteDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly platform = inject(Platform);

  currency = toSignal(this.storeService.currencyFromSettings$);

  async submitNewBite(newBite: any) {
    const currentPosition = await getCurrentPosition(this.platform);

    const enrichedBite = {
      ...newBite,
      tags: splitTags(newBite.tags),
      position: new GeoPoint(
        currentPosition.coords.latitude,
        currentPosition.coords.longitude
      ),
    };

    this.storeService.save(enrichedBite, 'bite');
  }
}
