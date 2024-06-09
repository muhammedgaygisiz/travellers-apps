import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonFooter,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  PopoverController,
} from '@ionic/angular/standalone';
import { PopoverMenuComponent } from './popover-menu.component';
import { AngularDelegate } from '@ionic/angular';
import { SupportedLang } from '@travellers-apps/prices/localization';

@Component({
  standalone: true,
  selector: 'ta-page',
  templateUrl: './page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonIcon,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonFooter,
  ],
  providers: [PopoverController, AngularDelegate],
  styleUrl: './page.component.scss',
})
export class PageComponent {
  @Input()
  enableBackButton = false;

  @Input()
  isAuthenticated: boolean | null = false;

  @Input()
  hideAuthButton = false;

  @Output()
  public addItemClick = new EventEmitter();

  @Output()
  public loginClick = new EventEmitter();

  @Output()
  public logoutClick = new EventEmitter();

  @Output()
  public languageChangeClick = new EventEmitter<SupportedLang>();

  // eslint-disable-next-line no-unused-vars
  constructor(public popoverController: PopoverController) {}

  async showMenuPopover($event: MouseEvent) {
    const popover = await this.popoverController.create({
      component: PopoverMenuComponent,
      event: $event,
      dismissOnSelect: true,
      componentProps: {
        isAuthenticated: this.isAuthenticated,
        hideAuthButton: this.hideAuthButton,
        loginClick: this.loginClick,
        logoutClick: this.logoutClick,
        languageChangeClick: this.languageChangeClick,
      },
    });

    await popover.present();
  }
}
