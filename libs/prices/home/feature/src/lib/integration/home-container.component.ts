import {ChangeDetectionStrategy, Component} from "@angular/core";
import {Observable} from "rxjs";
import {HomeService} from "./home.service";
import {MostSearchedItem} from "@travellers-apps/prices/store/feature";

@Component({
  template: `
    <ta-home
        [mostSearchedEntries]="mostSearchedEntries$ | async"
    ></ta-home>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeContainerComponent {
  constructor(
    private readonly homeService: HomeService
  ) {
  }

  public mostSearchedEntries$: Observable<MostSearchedItem[]> = this.homeService.mostSearched$;
}
