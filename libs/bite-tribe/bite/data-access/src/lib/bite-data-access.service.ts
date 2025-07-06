import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { splitTags } from 'utils';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class BiteDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  bite = toSignal(this.storeService.bite$);
  currency = toSignal(this.storeService.currencyFromSettings$);
  position = toSignal(this.storeService.position$);
  cachedBite = toSignal(this.storeService.cachedBite$);
  editingBite = toSignal(this.storeService.editingBite$);

  async submitNewBite(newBite: any) {
    const enrichedBite = {
      ...newBite,
      tags: splitTags(newBite.tags),
    };

    this.storeService.save(enrichedBite, 'bite');
  }

  async submitEditedBite(editedBite: any) {
    const enrichedBite = {
      ...editedBite,
      tags: splitTags(editedBite.tags),
    };

    this.storeService.save(enrichedBite, 'bite');
  }

  setEditedImage(image: string) {
    const enrichedBite = {
      ...this.editingBite(),
      image,
    };
    this.storeService.saveEditingBite(enrichedBite);
  }
}
