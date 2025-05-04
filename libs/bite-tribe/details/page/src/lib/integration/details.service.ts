import { inject, Injectable } from '@angular/core';
import { DetailsDataAccessService } from 'bite-tribe/details-data-access';

@Injectable({ providedIn: 'root' })
export class DetailsService {
  dataAccess = inject(DetailsDataAccessService);

  bite = this.dataAccess.bite;

  saveNewTags(newTags: string) {
    this.dataAccess.saveNewTags(newTags);
  }
}
