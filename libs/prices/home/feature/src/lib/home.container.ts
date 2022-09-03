import {ChangeDetectionStrategy, Component} from "@angular/core";
import {Observable, of} from "rxjs";
import {dummyEntries} from "./dummies";

@Component({
  template: `
    <ta-home
        [mostSearchedEntries]="mostSearchedEntries$ | async"
    ></ta-home>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeContainer {
  mostSearchedEntries$: Observable<{}[]> = of(dummyEntries);
}
