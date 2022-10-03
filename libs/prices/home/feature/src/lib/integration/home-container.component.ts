import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { HomeService } from './home.service';
import { NavController } from '@ionic/angular';
import { MostSearchedItem } from '@travellers-apps/utils-common';

@Component({
  template: `
    <ta-home
      class="ion-page"
      [mostSearchedEntries]="mostSearchedEntries$ | async"
      [isAuthenticated]="isAuthenticated$ | async"
      (addItemClick)="onAddItemClick()"
      (loginClick)="onLoginClick()"
    ></ta-home>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeContainerComponent implements OnInit {
  //TODO: Check later why parameters hit eslint error -.-
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly homeService: HomeService,
    // eslint-disable-next-line no-unused-vars
    private readonly navController: NavController
  ) {}

  public mostSearchedEntries$: Observable<MostSearchedItem[]> =
    this.homeService.mostSearched$;

  public isAuthenticated$: Observable<boolean | null> =
    this.homeService.isAuthenticated$;

  ngOnInit() {
    this.homeService.loadMostSearchedEntries();
  }

  public async onAddItemClick() {
    await this.navController.navigateForward(['/add-item']);
  }

  public async onLoginClick() {
    await this.navController.navigateForward(['/login']);
  }
}
