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
  selector: 'ta-add-popover-menu',
  template: `
    <ion-list lines="none" data-cy="menu-list">
      <ion-item-group>
        <ion-item-divider>
          <ion-icon color="dark" name="add" slot="start" />
          Hinzufügen
        </ion-item-divider>

        <ion-item [detail]="false" (click)="menuItemClicked.emit('add-bank')">
          <ion-icon src="assets/bank.svg" slot="start" />
          Bank hinzufügen
        </ion-item>

        <ion-item
          [detail]="false"
          (click)="menuItemClicked.emit('add-account')"
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

  loginClick = output();

  logoutClick = output();

  menuItemClicked = output<string>();
}
