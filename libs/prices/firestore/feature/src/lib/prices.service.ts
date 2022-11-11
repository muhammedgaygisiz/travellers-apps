import { from, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
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
  public allMostSearchedItems$: Observable<MostSearchedItem[]> = this.afs
    .collection<MostSearchedItem>(PRICES_COLLECTION)
    .valueChanges();

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly afs: AngularFirestore
  ) {}

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