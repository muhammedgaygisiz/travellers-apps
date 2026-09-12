import { computed, inject, Injectable, Signal } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { withMenuIds } from 'model';
import type { Bite, Menu } from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';
import { createEntityId } from 'utils';

@Injectable({
  providedIn: 'root',
})
export class MenuDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);

  bite = toSignal(this.storeService.bite$);
  restaurant = toSignal(this.storeService.restaurant$);

  private readonly storedMenu = toSignal(this.storeService.menu$);

  /**
   * The route's menu, with an id on every category, item and variant.
   *
   * Menus written before issue #1099 carry none, and the admin backfill closes
   * that for the collection at rest - but only once an operator has pressed it,
   * and only for menus that existed when they did. Filling in what is missing
   * on read means the editor is keying by id from the first render either way,
   * and the ids it generated are persisted by the owner's next save.
   *
   * `withMenuIds` returns the menu it was given when nothing was missing, so a
   * menu that has been backfilled passes through by identity and the
   * `linkedSignal` chain the editor is built on is not restarted on every read.
   */
  menu: Signal<Menu | undefined> = computed(() => {
    const stored = this.storedMenu();

    return stored ? withMenuIds(stored, createEntityId) : stored;
  });

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
