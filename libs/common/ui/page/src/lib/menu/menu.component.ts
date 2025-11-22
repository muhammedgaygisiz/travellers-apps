import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  IonIcon,
  IonItem,
  IonItemDivider,
  IonItemGroup,
  IonList,
} from '@ionic/angular/standalone';
import { SupportedLang } from 'localization';

@Component({
  selector: 'popover-menu',
  templateUrl: 'menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonList, IonItem, IonIcon, IonItemGroup, IonItemDivider],
})
export class MenuComponent {
  protected readonly SupportedLang = SupportedLang;

  isAuthenticated = input<boolean | null>(false);

  hideAuthButton = input<boolean | null>(false);

  showLanguages = input<boolean | null>(true);

  showSettingsButton = input<boolean | null>(false);

  showMigrationsButton = input<boolean | null>(false);

  showMyBites = input<boolean | null>(false);

  showMyBucketlists = input<boolean | null>(false);

  showMyProfile = input<boolean | null>(false);

  loginClick = output();

  logoutClick = output();

  gotoSettings = output();

  gotoProfile = output();

  gotoMigrations = output();

  gotoMyBites = output();

  gotoMyBucketlists = output();

  languageChangeClick = output<SupportedLang>();
}
