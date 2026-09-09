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

  /**
   * The restaurant comes from the **route parameter**, not from the loaded
   * restaurant. Both menu routes carry `:restaurantId`, so the parameter is
   * always there; `restaurant` is a derived selector that returns `undefined`
   * whenever there is no GPS position, which is an ordinary state for anyone
   * who declined the location permission. Reading the id off it would fail the
   * save for those users and nowhere else. The rules that authorise the write
   * read this id (issue #1078).
   */
  saveMenu(menu: Menu): Promise<void> {
    return this.api.saveMenu(menu, this.storeService.restaurantIdFromUrl());
  }

  retryMenuLoad(): void {
    this.storeService.retryMenuLoad();
  }

  prepareBiteFromMenuItem(biteToBeCreated: Partial<Bite>): void {
    this.storeService.cacheBite(biteToBeCreated);
  }
}
