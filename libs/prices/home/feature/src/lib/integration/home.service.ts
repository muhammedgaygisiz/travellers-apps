import {Injectable} from '@angular/core';
import {Store} from "@ngrx/store";
import {fromMostSearched} from "@travellers-apps/prices/store/feature";

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  mostSearched$ = this.store.select(fromMostSearched.selectAllItems);

  constructor(
    private store: Store
  ) { }
}
