import { from, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { MostSearchedItem, Price } from '@travellers-apps/utils-common';
import {
  AngularFirestore,
  DocumentReference,
} from '@angular/fire/compat/firestore';
import { v4 as uuidV4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class MostSearchedService {
  public allMostSearchedItems$: Observable<MostSearchedItem[]> = this.afs
    .collection<MostSearchedItem>('most-searched-items')
    .valueChanges();

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly afs: AngularFirestore
  ) {}

  saveMostSearchedItem$(item: Price): Observable<DocumentReference> {
    return from(
      this.afs.collection<MostSearchedItem>('most-searched-items').add({
        id: uuidV4(),
        src: item.src,
        name: item.productName,
        price: item.price,
        location: item.location,
      })
    );
  }
}
