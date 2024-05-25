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

@Component({
  selector: 'ta-popover-menu',
  template: `
    <ion-list lines="none">
      <ion-item-group>
        <ion-item-divider>
          <ion-icon color="dark" name="language-outline" slot="start" />
          Language
        </ion-item-divider>

        <ion-item [detail]="false">
          <ion-icon src="gb.svg" slot="start"></ion-icon>
          English
        </ion-item>
        <ion-item [detail]="false">
          <ion-icon src="fr.svg" slot="start"></ion-icon>
          Français
        </ion-item>
        <ion-item [detail]="false">
          <ion-icon src="de.svg" slot="start"></ion-icon>
          Deutsch
        </ion-item>
        <ion-item [detail]="false">
          <ion-icon src="tr.svg" slot="start"></ion-icon>
          Türkçe
        </ion-item>
      </ion-item-group>

      @if(!hideAuthButton) { @if (!isAuthenticated) {
      <ion-item [button]="true" [detail]="false" (click)="loginClick.emit()">
        <ion-icon color="dark" name="log-in-outline" slot="start" />
        Login
      </ion-item>
      } @else {
      <ion-item [button]="true" [detail]="false" (click)="logoutClick.emit()">
        <ion-icon color="dark" name="log-out-outline" slot="start" />
        Logout
      </ion-item>
      } }
    </ion-list>
  `,
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonList, IonItem, IonIcon, IonItemGroup, IonItemDivider],
})
export class PopoverMenuComponent {
  @Input()
  isAuthenticated: boolean | null = false;

  @Input()
  hideAuthButton = false;

  @Output()
  public loginClick: EventEmitter<void> = new EventEmitter();

  @Output()
  public logoutClick: EventEmitter<void> = new EventEmitter();
}
