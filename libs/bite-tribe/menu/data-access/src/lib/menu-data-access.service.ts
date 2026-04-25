import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Bite, Menu } from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';

@Injectable({
  providedIn: 'root',
})
export class MenuDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);

  bite = toSignal(this.storeService.bite$);
  restaurant = toSignal(this.storeService.restaurant$);
  menu = toSignal(this.storeService.menu$);

  saveMenu(menu: Menu): void {
    this.api.saveMenu(menu);
  }

  prepareBiteFromMenuItem(biteToBeCreated: Partial<Bite>): void {
    this.storeService.cacheBite(biteToBeCreated);
  }
}
