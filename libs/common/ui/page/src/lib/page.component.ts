import {
  booleanAttribute,
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
  IonProgressBar,
  IonSpinner,
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
import { APP_TITLE, SIGNED_IN_ACCOUNT } from 'utils';
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
    IonProgressBar,
    IonSpinner,
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

  /**
   * Optional so an app that binds no account still gets the page chrome, and so
   * the shared component keeps no dependency on any app's user store.
   */
  private readonly signedInAccountToken = inject(SIGNED_IN_ACCOUNT, {
    optional: true,
  });

  popoverController = inject(PopoverController);

  menuConfig = input<PageMenuConfig>({});

  chrome = input<PageChromeConfig>({});

  /**
   * Reports a background load through an indeterminate progress bar in the
   * header separator. Pages use it for a refresh that has content to keep on
   * screen; a spinner or skeleton stays reserved for the first load, where
   * there is nothing to show yet. See GitHub issue #1168.
   */
  loading = input(false, { transform: booleanAttribute });

  /**
   * Reports that the add button's target is still opening. Reaching the Create
   * Bite page is a guard chain plus a lazy chunk, so the tap has seconds of
   * nothing to show for it unless the button says so itself. The button locks
   * behind a spinner and the pending label while it is raised, the same way the
   * sign-in submit does. See GitHub issue #1287.
   */
  addButtonPending = input(false, { transform: booleanAttribute });

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

  /**
   * Reading the bound account through a computed keeps the open popover on the
   * live session rather than on whoever was signed in when it was opened, and
   * gives the menu a signal to call even when no app bound the token.
   */
  private readonly account = computed(() => this.signedInAccountToken?.());

  /**
   * The menu entries promoted out of the hamburger at desktop widths, in the
   * popover's own order so the three it lists first are the three that surface
   * directly. Each stays gated by its menu flag, so a page only promotes what
   * it already offers, and the remaining entries keep the menu button. The
   * popover is the only navigation below the desktop breakpoint, where the
   * header has no room for these. See GitHub issue #1250.
   */
  protected readonly desktopNavItems = computed<
    { target: PageMenuTarget; labelKey: string }[]
  >(() => {
    if (!this.chromeConfig().desktopLayout || !this.isAuthenticated()) {
      return [];
    }

    const menu = this.menu();

    return [
      { target: 'profile', labelKey: 'my-profile', show: menu.myProfile },
      { target: 'my-bites', labelKey: 'my-bites', show: menu.myBites },
      {
        target: 'my-bucketlists',
        labelKey: 'my-bucket-lists',
        show: menu.myBucketlists,
      },
    ]
      .filter(({ show }) => show)
      .map(({ target, labelKey }) => ({
        target: target as PageMenuTarget,
        labelKey,
      }));
  });

  /**
   * The add button is rendered in the header instead of the footer bar once the
   * page opts into the desktop layout, so the footer is released at desktop
   * widths rather than covering the bottom of the content.
   */
  protected readonly addButtonInHeader = computed(
    () =>
      this.chromeConfig().desktopLayout && this.chromeConfig().showAddButton,
  );

  protected readonly showDesktopNav = computed(
    () =>
      this.chromeConfig().desktopLayout &&
      (this.desktopNavItems().length > 0 || this.chromeConfig().showAddButton),
  );

  /**
   * The disabled button already blocks this, but a tap can be queued between
   * the click and the pending flag turning on.
   */
  onAddButtonClick($event: MouseEvent): void {
    if (this.addButtonPending()) {
      return;
    }

    this.addButtonClick.emit($event);
  }

  async showMenuPopover($event: MouseEvent): Promise<void> {
    const popover = await this.popoverController.create({
      component: AppMenuComponent,
      event: $event,
      dismissOnSelect: true,
      componentProps: {
        isAuthenticated: this.isAuthenticated,
        account: this.account,
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
