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
import { AppMenuComponent } from './menu/app-menu.component';
import {
  DEFAULT_PAGE_CHROME_CONFIG,
  DEFAULT_PAGE_MENU_CONFIG,
  PageChromeConfig,
  PageMenuConfig,
  PageMenuTarget,
} from './page-config';
import { APP_TITLE } from 'utils';
import { UpperCasePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

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
    TranslocoPipe,
  ],
  providers: [PopoverController, AngularDelegate],
  styleUrl: './page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageComponent {
  appTitleToken = inject(APP_TITLE, { optional: true });

  popoverController = inject(PopoverController);

  menuConfig = input<PageMenuConfig>({});

  chrome = input<PageChromeConfig>({});

  // Merge partial configs over the defaults so unspecified flags keep their
  // default value (Angular replaces the whole object on partial input).
  protected readonly chromeConfig = computed<Required<PageChromeConfig>>(
    () => ({
      ...DEFAULT_PAGE_CHROME_CONFIG,
      ...this.chrome(),
    }),
  );

  private readonly menu = computed<Required<PageMenuConfig>>(() => ({
    ...DEFAULT_PAGE_MENU_CONFIG,
    ...this.menuConfig(),
  }));

  addButtonText = input<string | null>();

  isAuthenticated = input(false);

  title = input('');

  icon = input('');

  appTitle = computed(() => {
    const title = this.title();

    if (title) {
      return title;
    }

    return this.appTitleToken;
  });

  public loginClick = output();

  public logoutClick = output();

  public menuNavigate = output<PageMenuTarget>();

  public addButtonClick = output<MouseEvent>();

  // Ionic assigns componentProps onto the menu instance via Object.assign, so
  // each menu flag is forwarded as a callable signal derived from the merged
  // menu config.
  private readonly showSettingsButton = computed(() => this.menu().settings);
  private readonly showAboutButton = computed(() => this.menu().about);
  private readonly showMyBites = computed(() => this.menu().myBites);
  private readonly showMyBucketlists = computed(
    () => this.menu().myBucketlists,
  );
  private readonly showMyProfile = computed(() => this.menu().myProfile);
  private readonly showMigrationsButton = computed(
    () => this.menu().migrations,
  );
  private readonly showMarketPlaceButton = computed(
    () => this.menu().marketPlace,
  );
  private readonly showGalleryButton = computed(() => this.menu().gallery);
  private readonly showLeaderboardButton = computed(
    () => this.menu().leaderboard,
  );
  private readonly hideAuthButton = computed(() => this.menu().hideAuth);

  async showMenuPopover($event: MouseEvent): Promise<void> {
    const popover = await this.popoverController.create({
      component: AppMenuComponent,
      event: $event,
      dismissOnSelect: true,
      componentProps: {
        isAuthenticated: this.isAuthenticated,
        hideAuthButton: this.hideAuthButton,
        showSettingsButton: this.showSettingsButton,
        showAboutButton: this.showAboutButton,
        showMyBites: this.showMyBites,
        showMyBucketlists: this.showMyBucketlists,
        showMyProfile: this.showMyProfile,
        showMigrationsButton: this.showMigrationsButton,
        showMarketPlaceButton: this.showMarketPlaceButton,
        showGalleryButton: this.showGalleryButton,
        showLeaderboardButton: this.showLeaderboardButton,
        loginClick: this.loginClick,
        logoutClick: this.logoutClick,
        menuNavigate: this.menuNavigate,
      },
    });

    await popover.present();
  }
}
