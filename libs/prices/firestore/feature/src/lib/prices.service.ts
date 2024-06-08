import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  Firestore,
} from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { v4 as uuidV4 } from 'uuid';
import { MostSearchedItem } from './api/most-searched-item.model';
import { Price } from './api/price.model';

const PRICES_COLLECTION = 'prices';

@Injectable({
  providedIn: 'root',
})
export class PricesService {
  private readonly afs = inject(Firestore);
  private pricesCollection = collection(this.afs, PRICES_COLLECTION);

  public allMostSearchedItems$ = collectionData(
    this.pricesCollection
  ) as Observable<MostSearchedItem[]>;

  saveMostSearchedItem$(item: Price) {
    return from(
      addDoc(this.pricesCollection, {
        id: uuidV4(),
        image: item.image,
        name: item.productName,
        price: item.price,
        location: item.location,
      })
    );
  }
}
