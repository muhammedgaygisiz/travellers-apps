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
  selector: 'ta-popover-menu',
  template: `
    <ion-list lines="none" data-cy="menu-list">
      @if (showLanguages()) {
      <ion-item-group>
        <ion-item-divider>
          <ion-icon color="dark" name="language-outline" slot="start" />
          Language
        </ion-item-divider>

        <ion-item
          [detail]="false"
          (click)="languageChangeClick.emit(SupportedLang.EN)"
        >
          <ion-icon src="assets/gb.svg" slot="start" />
          English
        </ion-item>
        <ion-item
          [detail]="false"
          (click)="languageChangeClick.emit(SupportedLang.FR)"
        >
          <ion-icon src="assets/fr.svg" slot="start" />
          Français
        </ion-item>
        <ion-item
          [detail]="false"
          (click)="languageChangeClick.emit(SupportedLang.DE)"
        >
          <ion-icon src="assets/de.svg" slot="start" />
          Deutsch
        </ion-item>
        <ion-item
          [detail]="false"
          (click)="languageChangeClick.emit(SupportedLang.TR)"
        >
          <ion-icon src="assets/tr.svg" slot="start" />
          Türkçe
        </ion-item>
      </ion-item-group>
      } @if (!hideAuthButton()) { @if (!isAuthenticated()) {
      <ion-item
        data-cy="btn-login"
        [button]="true"
        [detail]="false"
        (click)="loginClick.emit()"
      >
        <ion-icon color="dark" name="log-in-outline" slot="start" />
        Login
      </ion-item>
      } @else {
      <ion-item
        data-cy="btn-logout"
        [button]="true"
        [detail]="false"
        (click)="logoutClick.emit()"
      >
        <ion-icon color="dark" name="log-out-outline" slot="start" />
        Logout
      </ion-item>
      } }
    </ion-list>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonList, IonItem, IonIcon, IonItemGroup, IonItemDivider],
})
export class PopoverMenuComponent {
  protected readonly SupportedLang = SupportedLang;

  isAuthenticated = input<boolean | null>(false);

  hideAuthButton = input<boolean | null>(false);

  showLanguages = input<boolean | null>(true);

  loginClick = output();

  logoutClick = output();

  languageChangeClick = output<SupportedLang>();
}
