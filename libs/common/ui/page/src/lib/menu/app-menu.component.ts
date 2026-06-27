import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  IonIcon,
  IonItem,
  IonItemGroup,
  IonList,
} from '@ionic/angular/standalone';
import { SupportedLang } from 'utils';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonList, IonItem, IonIcon, TranslocoPipe, IonItemGroup],
})
export class AppMenuComponent {
  protected readonly version = process.env['version'];
  protected readonly buildNumber = process.env['buildNumber'];
  protected readonly SupportedLang = SupportedLang;

  isAuthenticated = input<boolean | null>(false);

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

  gotoSettings = output();

  gotoAbout = output();

  gotoProfile = output();

  gotoMigrations = output();

  gotoMyBites = output();

  gotoMyBucketlists = output();

  gotoMarketPlace = output();

  gotoGallery = output();

  gotoLeaderboard = output();
}
