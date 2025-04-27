import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';

type Bite = Partial<{
  image: string | null;
  name: string | null;
  price: number | null;
}>;

@Injectable({ providedIn: 'root' })
export class BiteService {
  storeService = inject(BiteTribeStoreService);

  submitNewBite(newBite: Bite) {
    this.storeService.save(newBite, 'bite');
  }
}
