import {Injectable} from '@angular/core';
import {Store} from "@ngrx/store";
import {of} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  mostSearched$ = of([]);

  constructor(
    private store: Store
  ) { }
}
