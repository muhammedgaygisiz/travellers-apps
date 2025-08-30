import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { v4 as uuidV4 } from 'uuid';
import { MostSearchedItem } from './api/most-searched-item.model';
import { Price } from './api/price.model';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

const PRICES_COLLECTION = 'prices';

@Injectable({
  providedIn: 'root',
})
export class PricesApiService {
  public allMostSearchedItems$ = of([]) as Observable<MostSearchedItem[]>;

  saveMostSearchedItem$(item: Price): Observable<any> {
    return from(
      FirebaseFirestore.addDocument({
        reference: PRICES_COLLECTION,
        data: {
          id: uuidV4(),
          image: item.image,
          name: item.productName,
          price: item.price,
          location: item.location,
        },
      })
    );
  }
}
