import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';

@Injectable({
  providedIn: 'root',
})
export class AboutDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  totalNumberBites = toSignal(this.storeService.totalNumberBites$);
  totalNumberUsers = toSignal(this.storeService.totalNumberUsers$);
}
