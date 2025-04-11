import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
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
import { AngularDelegate } from '@ionic/angular';
import { SupportedLang } from 'localization';
import { PopoverMenuComponent } from './popover-menu.component';

@Component({
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
  popoverController = inject(PopoverController);

  enableBackButton = input(false);

  showAddButton = input<boolean | null>(false);

  hideAuthButton = input(false);

  title = input('Prices');

  public addItemClick = output();

  public loginClick = output();

  public logoutClick = output();

  public languageChangeClick = output<SupportedLang>();

  public showAddPopover = output<MouseEvent>();

  async showMenuPopover($event: MouseEvent) {
    const popover = await this.popoverController.create({
      component: PopoverMenuComponent,
      event: $event,
      dismissOnSelect: true,
      componentProps: {
        isAuthenticated: this.showAddButton,
        hideAuthButton: this.hideAuthButton,
        loginClick: this.loginClick,
        logoutClick: this.logoutClick,
        languageChangeClick: this.languageChangeClick,
      },
    });

    await popover.present();
  }
}
