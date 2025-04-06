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
import { SupportedLang } from '@travellers-apps/prices/localization';

@Component({
  selector: 'ta-add-popover-menu',
  template: `
    <ion-list lines="none" data-cy="menu-list">
      <ion-item-group>
        <ion-item-divider>
          <ion-icon color="dark" name="add" slot="start" />
          Hinzufügen
        </ion-item-divider>

        <ion-item
          [detail]="false"
          (click)="languageChangeClick.emit(SupportedLang.EN)"
        >
          <ion-icon src="assets/bank.svg" slot="start"></ion-icon>
          Bank hinzufügen
        </ion-item>

        <ion-item
          [detail]="false"
          (click)="languageChangeClick.emit(SupportedLang.EN)"
        >
          <ion-icon src="assets/cash-coin.svg" slot="start"></ion-icon>
          Konto hinzufügen
        </ion-item>
      </ion-item-group>
    </ion-list>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonList, IonItem, IonIcon, IonItemGroup, IonItemDivider],
})
export class AddPopoverMenuComponent {
  protected readonly SupportedLang = SupportedLang;

  isAuthenticated = input<boolean | null>(false);

  hideAuthButton = input<boolean | null>(false);

  public loginClick = output();

  public logoutClick = output();

  public languageChangeClick = output<SupportedLang>();
}
