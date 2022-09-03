import { Injectable } from '@angular/core';
import {of} from "rxjs";
import {dummyEntries} from "../dummies";

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  mostSearched$ = of(dummyEntries);

  constructor() { }
}
