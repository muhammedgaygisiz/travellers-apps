import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { Observable } from 'rxjs';
import { HomeService } from './home.service';
import { MostSearchedItem } from '@travellers-apps/utils-common';
import { HomeComponent } from '../components';
import { AsyncPipe } from '@angular/common';

@Component({
  standalone: true,
  template: `
    <ta-home
      class="ion-page"
      [mostSearchedEntries]="mostSearchedEntries$ | async"
      [isAuthenticated]="isAuthenticated$ | async"
      [location]="location$ | async"
      (addItemClick)="onAddItemClick()"
      (loginClick)="onLoginClick()"
      (logoutClick)="onLogoutClick()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HomeComponent, AsyncPipe],
})
export class HomeContainerComponent implements OnInit {
  private readonly homeService = inject(HomeService);

  public location$: Observable<string | null> = this.homeService.location$;

  public mostSearchedEntries$: Observable<MostSearchedItem[]> =
    this.homeService.mostSearched$;

  public isAuthenticated$: Observable<boolean | null> =
    this.homeService.isAuthenticated$;

  ngOnInit() {
    this.homeService.loadMostSearchedEntries();
  }

  public async onAddItemClick() {
    await this.homeService.onAddItemClick();
  }

  public async onLoginClick() {
    await this.homeService.onLoginClick();
  }

  public async onLogoutClick() {
    this.homeService.logout();
  }
}
