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
  IonFab,
  IonFabButton,
  IonFooter,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  PopoverController,
} from '@ionic/angular/standalone';
import { AngularDelegate } from '@ionic/angular';
import { SupportedLang } from 'localization';
import { PopoverMenuComponent } from './popover-menu.component';
import { APP_TITLE, APP_ICON } from 'utils';

@Component({
  selector: 'ta-page',
  templateUrl: './page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonIcon,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonFooter,
  ],
  providers: [PopoverController, AngularDelegate],
  styleUrl: './page.component.scss',
})
export class PageComponent {
  appTitleToken = inject(APP_TITLE, { optional: true });
  appIconToken = inject(APP_ICON, { optional: true });

  popoverController = inject(PopoverController);

  enableBackButton = input(false);

  showAddButton = input<boolean | null>(false);

  hideAuthButton = input(false);

  showLanguages = input(true);

  title = input('');

  icon = input('pricetag-outline');

  showFooter = input(true);

  showHeaderMenu = input(true);

  showSettingsButton = input(false);

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

  public addButtonClick = output<MouseEvent>();

  async showMenuPopover($event: MouseEvent) {
    const popover = await this.popoverController.create({
      component: PopoverMenuComponent,
      event: $event,
      dismissOnSelect: true,
      componentProps: {
        isAuthenticated: this.showAddButton,
        hideAuthButton: this.hideAuthButton,
        showLanguages: this.showLanguages,
        showSettingsButton: this.showSettingsButton,
        loginClick: this.loginClick,
        logoutClick: this.logoutClick,
        languageChangeClick: this.languageChangeClick,
        gotoSettings: this.gotoSettings,
      },
    });

    await popover.present();
  }
}
