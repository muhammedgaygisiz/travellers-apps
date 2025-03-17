import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  IonIcon,
  IonItem,
  IonItemDivider,
  IonItemGroup,
  IonList,
} from '@ionic/angular/standalone';
import { SupportedLang } from '@travellers-apps/prices/localization';

@Component({
  selector: 'ta-popover-menu',
  template: `
    <ion-list lines="none" data-cy="menu-list">
      <ion-item-group>
        <ion-item-divider>
          <ion-icon color="dark" name="language-outline" slot="start" />
          Language
        </ion-item-divider>

        <ion-item
          [detail]="false"
          (click)="languageChangeClick.emit(SupportedLang.EN)"
        >
          <ion-icon src="assets/gb.svg" slot="start"></ion-icon>
          English
        </ion-item>
        <ion-item
          [detail]="false"
          (click)="languageChangeClick.emit(SupportedLang.FR)"
        >
          <ion-icon src="assets/fr.svg" slot="start"></ion-icon>
          Français
        </ion-item>
        <ion-item
          [detail]="false"
          (click)="languageChangeClick.emit(SupportedLang.DE)"
        >
          <ion-icon src="assets/de.svg" slot="start"></ion-icon>
          Deutsch
        </ion-item>
        <ion-item
          [detail]="false"
          (click)="languageChangeClick.emit(SupportedLang.TR)"
        >
          <ion-icon src="assets/tr.svg" slot="start"></ion-icon>
          Türkçe
        </ion-item>
      </ion-item-group>

      @if(!hideAuthButton) { @if (!isAuthenticated) {
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
  @Input()
  isAuthenticated: boolean | null = false;

  @Input()
  hideAuthButton = false;

  @Output()
  public loginClick = new EventEmitter();

  @Output()
  public logoutClick = new EventEmitter();

  @Output()
  public languageChangeClick = new EventEmitter<SupportedLang>();

  protected readonly SupportedLang = SupportedLang;
}
