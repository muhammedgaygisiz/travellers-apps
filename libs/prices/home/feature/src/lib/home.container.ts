import {ChangeDetectionStrategy, Component} from "@angular/core";
import {Observable, of} from "rxjs";

const entries = [{
  src: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Aroma_%28apple%29.jpg',
  name: 'Apples',
  price: 0.2
}, {
  src: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Assortment_of_pears.jpg',
  name: 'Bears',
  price: 0.2
}, {
  src: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Autumn_Red_peaches.jpg',
  name: 'Peaches',
  price: 0.2
}];

@Component({
  template: `
    <ta-home
        [mostSearchedEntries]="mostSearchedEntries$ | async"
    ></ta-home>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeContainer {
  mostSearchedEntries$: Observable<{}[]> = of(entries);
}
