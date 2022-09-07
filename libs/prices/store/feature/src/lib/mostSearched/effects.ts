import {Injectable} from "@angular/core";
import {Actions, createEffect, ofType} from "@ngrx/effects";
import {itemsLoaded, loadItems} from "./actions";
import {map, mergeMap, of} from "rxjs";
import {MostSearchedItem} from "@travellers-apps/prices/store/feature";

const dummies: MostSearchedItem[] = [{
  id: "1",
  src: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Aroma_%28apple%29.jpg',
  name: 'Apples',
  price: 0.2
}, {
  id: "2",
  src: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Assortment_of_pears.jpg',
  name: 'Bears',
  price: 0.2
}, {
  id: "3",
  src: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg',
  name: 'Peaches',
  price: 0.2
}];

@Injectable()
export class MostSearchedItemsEffects {
  loadMostSearchedItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadItems.type),
      mergeMap(() => of(dummies).pipe(
        map(mostSearchedEntries => itemsLoaded({ items: mostSearchedEntries}))
      ))
    )
  );

  constructor(
    private actions$: Actions,
  ) { }
}
