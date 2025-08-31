import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { Observable } from 'rxjs';
import { HomeService } from './home.service';
import { HomeComponent } from '../components';
import { AsyncPipe } from '@angular/common';
import { MostSearchedItem } from '../api/most-searched-item.model';
import { SupportedLang } from 'localization';

@Component({
  template: `
    <ta-home
      class="ion-page"
      [mostSearchedEntries]="mostSearchedEntries$ | async"
      [isAuthenticated]="isAuthenticated$ | async"
      [location]="location$ | async"
      (addItemClick)="onAddItemClick()"
      (loginClick)="onLoginClick()"
      (logoutClick)="onLogoutClick()"
      (languageChangeClick)="onLanguageChangeClick($event)"
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

  ngOnInit(): void {
    this.homeService.loadMostSearchedEntries();
  }

  public async onAddItemClick(): Promise<void> {
    await this.homeService.onAddItemClick();
  }

  public async onLoginClick(): Promise<void> {
    await this.homeService.onLoginClick();
  }

  public onLogoutClick(): void {
    this.homeService.logout();
  }

  public onLanguageChangeClick(event: SupportedLang): void {
    this.homeService.changeLanguage(event);
  }
}
