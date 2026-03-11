import { inject, Injectable } from '@angular/core';
import { MarketPlaceDataAccessService } from 'bite-tribe/market-place-data-access';

@Injectable({ providedIn: 'root' })
export class MarketPlaceService {
  dataAccess = inject(MarketPlaceDataAccessService);
}
