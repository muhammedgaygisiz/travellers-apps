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

  /** True while the route's menu has neither arrived nor been given up on. */
  isMenuLoading = toSignal(this.storeService.isMenuLoading$, {
    initialValue: true,
  });

  /** True once the read settled and there is no menu to show (#1382). */
  isMenuUnavailable = toSignal(this.storeService.isMenuUnavailable$, {
    initialValue: false,
  });

  saveMenu(menu: Menu): void {
    this.api.saveMenu(menu);
  }

  retryMenuLoad(): void {
    this.storeService.retryMenuLoad();
  }

  prepareBiteFromMenuItem(biteToBeCreated: Partial<Bite>): void {
    this.storeService.cacheBite(biteToBeCreated);
  }
}
