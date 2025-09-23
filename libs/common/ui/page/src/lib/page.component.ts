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
import { SupportedLang } from 'localization';
import { PopoverMenuComponent } from './popover-menu.component';
import { APP_ICON, APP_TITLE } from 'utils';
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
  appIconToken = inject(APP_ICON, { optional: true });

  popoverController = inject(PopoverController);

  enableBackButton = input(false);

  showAddButton = input<boolean | null>(false);

  hideAuthButton = input(false);

  isAuthenticated = input(false);

  showLanguages = input(true);

  title = input('');

  icon = input('');

  showFooter = input(true);

  showHeaderMenu = input(true);

  // TODO: Convert to input with list of menu items to be shown
  showSettingsButton = input(false);

  showMyBites = input(false);

  showMyBucketlists = input(false);

  showMigrationsButton = input(false);

  fullWidth = input(false);

  appTitle = computed(() => {
    const title = this.title();

    if (title) {
      return title;
    }

    return this.appTitleToken;
  });

  appIcon = computed(() => {
    if (this.appIconToken) {
      return this.appIconToken;
    }

    const icon = this.icon();
    if (icon) {
      return icon;
    }

    return '';
  });

  public addItemClick = output();

  public loginClick = output();

  public logoutClick = output();

  public languageChangeClick = output<SupportedLang>();

  public gotoSettings = output();

  public gotoMigrations = output();

  public gotoMyBites = output();

  public gotoMyBucketlists = output();

  public addButtonClick = output<MouseEvent>();

  public backButtonClicked = output();

  async showMenuPopover($event: MouseEvent): Promise<void> {
    const popover = await this.popoverController.create({
      component: PopoverMenuComponent,
      event: $event,
      dismissOnSelect: true,
      componentProps: {
        isAuthenticated: this.isAuthenticated,
        hideAuthButton: this.hideAuthButton,
        showLanguages: this.showLanguages,
        showSettingsButton: this.showSettingsButton,
        showMyBites: this.showMyBites,
        showMyBucketlists: this.showMyBucketlists,
        showMigrationsButton: this.showMigrationsButton,
        loginClick: this.loginClick,
        logoutClick: this.logoutClick,
        languageChangeClick: this.languageChangeClick,
        gotoSettings: this.gotoSettings,
        gotoMyBites: this.gotoMyBites,
        gotoMyBucketlists: this.gotoMyBucketlists,
        gotoMigrations: this.gotoMigrations,
      },
    });

    await popover.present();
  }
}
