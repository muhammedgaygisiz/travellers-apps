import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Bite, Menu } from 'model';

@Injectable({
  providedIn: 'root',
})
export class MenuDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  bite = toSignal(this.storeService.bite$);
  restaurant = toSignal(this.storeService.restaurant$);
  menu = toSignal(this.storeService.menu$);

  saveMenu(menu: Menu) {
    this.storeService.saveMenu(menu);
  }

  prepareBiteFromMenuItem(biteToBeCreated: Partial<Bite>) {
    this.storeService.prepareBiteFromMenuItem(biteToBeCreated);
  }
}
