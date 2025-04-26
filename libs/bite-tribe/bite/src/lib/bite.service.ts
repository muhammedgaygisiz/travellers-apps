import { inject, Injectable } from '@angular/core';
import { STORE_SERVICE } from 'utils';

type Bite = Partial<{
  image: string | null;
  name: string | null;
  price: number | null;
}>;

@Injectable({ providedIn: 'root' })
export class BiteService {
  storeService = inject(STORE_SERVICE);

  submitNewBite(newBite: Bite) {
    this.storeService.save(newBite, 'bite');
  }
}
