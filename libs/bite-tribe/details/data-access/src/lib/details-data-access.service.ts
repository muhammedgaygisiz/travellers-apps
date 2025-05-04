import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class DetailsDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  bite = toSignal(this.storeService.bite$);

  saveNewTags(newTags: string) {
    const currentBite = this.bite();

    if (currentBite) {
      const newTagsArray = newTags
        .split(/[\s,]+/)
        .filter((tag) => tag.trim().length > 0);

      this.storeService.saveTags(newTagsArray, currentBite.id);

      return;
    }
  }
}
