import { from, Observable } from 'rxjs';
import { inject, Injectable } from '@angular/core';
import { MostSearchedItem, Price } from '@travellers-apps/utils-common';
import {
  AngularFirestore,
  DocumentReference,
} from '@angular/fire/compat/firestore';
import { v4 as uuidV4 } from 'uuid';

const PRICES_COLLECTION = 'prices';

@Injectable({
  providedIn: 'root',
})
export class PricesService {
  private readonly afs = inject(AngularFirestore);

  public allMostSearchedItems$: Observable<MostSearchedItem[]> = this.afs
    .collection<MostSearchedItem>(PRICES_COLLECTION)
    .valueChanges();

  saveMostSearchedItem$(item: Price): Observable<DocumentReference> {
    return from(
      this.afs.collection<MostSearchedItem>(PRICES_COLLECTION).add({
        id: uuidV4(),
        src: item.src,
        name: item.productName,
        price: item.price,
        location: item.location,
      })
    );
  }
}
