import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { MostSearchedItem } from '@travellers-apps/utils-common';
import { AngularFirestore } from '@angular/fire/compat/firestore';

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
}
