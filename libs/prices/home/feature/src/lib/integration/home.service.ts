import {Injectable} from '@angular/core';
import {Store} from "@ngrx/store";
import {fromMostSearchedEntries} from "@travellers-apps/prices/store/feature";

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  mostSearched$ = this.store.select(fromMostSearchedEntries.mostSearchedState);

  constructor(
    private store: Store
  ) { }
}
