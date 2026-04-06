import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonText,
  IonTitle,
  IonToolbar,
  PopoverController,
} from '@ionic/angular/standalone';
import { AngularDelegate } from '@ionic/angular';
import { MenuComponent } from './menu/menu.component';
import { APP_TITLE, SupportedLang } from 'utils';
import { UpperCasePipe } from '@angular/common';

@Component({
  selector: 'ta-page',
  templateUrl: './page.component.html',
  imports: [
    IonIcon,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonContent,
    IonFooter,
    IonText,
    UpperCasePipe,
  ],
  providers: [PopoverController, AngularDelegate],
  styleUrl: './page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageComponent {
  appTitleToken = inject(APP_TITLE, { optional: true });

  popoverController = inject(PopoverController);

  enableBackButton = input(false);

  showAddButton = input<boolean | null>(false);

  addButtonText = input<string | null>($localize`Create Bite`);

  hideAuthButton = input(false);

  isAuthenticated = input(false);

  showLanguages = input(false);

  title = input('');

  icon = input('');

  showFooter = input(true);

  showHeaderMenu = input(true);

  showSettingsButton = input(false);

  showAboutButton = input(false);

  showMyBites = input(false);

  showMyBucketlists = input(false);

  showMyProfile = input(false);

  showMigrationsButton = input(false);

  showMarketPlaceButton = input(false);

  fullWidth = input(false);

  appTitle = computed(() => {
    const title = this.title();

    if (title) {
      return title;
    }

    return this.appTitleToken;
  });

  public addItemClick = output();

  public loginClick = output();

  public logoutClick = output();

  public languageChangeClick = output<SupportedLang>();

  public gotoSettings = output();

  public gotoAbout = output();

  public gotoProfile = output();

  public gotoMigrations = output();

  public gotoMyBites = output();

  public gotoMyBucketlists = output();

  public gotoMarketPlace = output();

  public addButtonClick = output<MouseEvent>();

  async showMenuPopover($event: MouseEvent): Promise<void> {
    const popover = await this.popoverController.create({
      component: MenuComponent,
      event: $event,
      dismissOnSelect: true,
      componentProps: {
        isAuthenticated: this.isAuthenticated,
        hideAuthButton: this.hideAuthButton,
        showLanguages: this.showLanguages,
        showSettingsButton: this.showSettingsButton,
        showAboutButton: this.showAboutButton,
        showMyBites: this.showMyBites,
        showMyBucketlists: this.showMyBucketlists,
        showMyProfile: this.showMyProfile,
        showMigrationsButton: this.showMigrationsButton,
        showMarketPlaceButton: this.showMarketPlaceButton,
        loginClick: this.loginClick,
        logoutClick: this.logoutClick,
        languageChangeClick: this.languageChangeClick,
        gotoSettings: this.gotoSettings,
        gotoAbout: this.gotoAbout,
        gotoMyBites: this.gotoMyBites,
        gotoMyBucketlists: this.gotoMyBucketlists,
        gotoMigrations: this.gotoMigrations,
        gotoProfile: this.gotoProfile,
        gotoMarketPlace: this.gotoMarketPlace,
      },
    });

    await popover.present();
  }
}
