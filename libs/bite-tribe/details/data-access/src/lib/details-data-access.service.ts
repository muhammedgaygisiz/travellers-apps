import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { splitTags } from 'utils';
import { from } from 'rxjs';
import { getCurrentPosition } from 'geolocation';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class DetailsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly platform = inject(Platform);

  bite = toSignal(this.storeService.bite$);
  reviews = toSignal(this.storeService.reviews$, { initialValue: [] as any });

  saveNewTags(newTags: string) {
    const currentBite = this.bite();

    if (currentBite) {
      const newTagsArray = splitTags(newTags);

      this.storeService.saveTags(newTagsArray, currentBite.id);

      return;
    }
  }

  saveNewReview(newReview: { review: string; biteId: string }) {
    this.storeService.saveReview(newReview);
  }

  currentPosition() {
    return toSignal(from(getCurrentPosition(this.platform)), {
      initialValue: null,
    });
  }
}
