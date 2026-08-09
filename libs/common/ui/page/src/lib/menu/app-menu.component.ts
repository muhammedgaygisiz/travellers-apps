import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  IonAvatar,
  IonIcon,
  IonItem,
  IonItemGroup,
  IonList,
} from '@ionic/angular/standalone';
import { SignedInAccount, SupportedLang } from 'utils';
import { PageMenuTarget } from '../page-config';
import { TranslocoPipe } from '@jsverse/transloco';

declare const process: {
  env: {
    version?: string;
    buildNumber?: string;
  };
};

@Component({
  selector: 'popover-menu',
  templateUrl: 'app-menu.component.html',
  styleUrl: 'app-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonList, IonItem, IonIcon, TranslocoPipe, IonItemGroup, IonAvatar],
})
export class AppMenuComponent {
  protected readonly version = process.env['version'];
  protected readonly buildNumber = process.env['buildNumber'];
  protected readonly SupportedLang = SupportedLang;

  isAuthenticated = input<boolean | null>(false);

  /**
   * The signed-in account, so the menu can say who it belongs to without a trip
   * to the profile page. It rides on the profile entry rather than a row of its
   * own: the avatar replaces that entry's icon and the display name becomes its
   * subtitle, which names the account without costing the menu any height it
   * did not already have. See GitHub issue #1260.
   */
  account = input<SignedInAccount | undefined>();

  hideAuthButton = input<boolean | null>(false);

  showSettingsButton = input<boolean | null>(false);

  showAboutButton = input<boolean | null>(false);

  showMigrationsButton = input<boolean | null>(false);

  showMyBites = input<boolean | null>(false);

  showMyBucketlists = input<boolean | null>(false);

  showMyProfile = input<boolean | null>(false);

  showMarketPlaceButton = input<boolean | null>(false);

  showGalleryButton = input<boolean | null>(false);

  showLeaderboardButton = input<boolean | null>(false);

  loginClick = output();

  logoutClick = output();

  menuNavigate = output<PageMenuTarget>();

  /**
   * A photo that failed to load leaves the entry with a broken image where its
   * icon used to be, so the anonymous icon is restored instead. The flag is
   * keyed on nothing but the URL, so a later account brings its own attempt.
   */
  private readonly failedPhotoUrl = signal<string | undefined>(undefined);

  protected readonly displayName = computed(
    () => this.account()?.displayName ?? '',
  );

  protected readonly photoUrl = computed(() => {
    const photoUrl = this.account()?.photoUrl;

    if (!photoUrl || photoUrl === this.failedPhotoUrl()) {
      return '';
    }

    return photoUrl;
  });

  protected onPhotoError(): void {
    this.failedPhotoUrl.set(this.account()?.photoUrl);
  }
}
