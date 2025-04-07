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

interface Item {
  text: string;
  icon: string;
  value: string;
}

@Component({
  selector: 'ta-add-popover-menu',
  template: `
    <ion-list lines="none" data-cy="menu-list">
      <ion-item-group>
        <ion-item-divider>
          <ion-icon color="dark" name="add" slot="start" />
          Hinzufügen
        </ion-item-divider>

        @for (item of items(); let idx = $index; track idx) {
        <ion-item [detail]="false" (click)="menuItemClicked.emit(item.value)">
          <ion-icon src="{{ item.icon }}" slot="start" />
          {{ item.text }}
        </ion-item>
        }
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

  items = input<Item[]>([]);

  loginClick = output();

  logoutClick = output();

  menuItemClicked = output<string>();
}
