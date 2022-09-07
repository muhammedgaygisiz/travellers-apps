import {ChangeDetectionStrategy, Component, OnInit} from "@angular/core";
import {Observable} from "rxjs";
import {HomeService} from "./home.service";
import {MostSearchedItem} from "@travellers-apps/prices/store/feature";

@Component({
  template: `
    <ta-home
      class="ion-page"
      [mostSearchedEntries]="mostSearchedEntries$ | async"
    ></ta-home>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeContainerComponent implements OnInit{
  constructor(
    private readonly homeService: HomeService
  ) {
  }

  public mostSearchedEntries$: Observable<MostSearchedItem[]> = this.homeService.mostSearched$;

  ngOnInit() {
    this.homeService.loadMostSearchedEntries();
  }
}
