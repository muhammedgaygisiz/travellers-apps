import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  arrowBackOutline,
  checkmarkOutline,
  close,
  closeOutline,
  filterOutline,
  languageOutline,
  locationOutline,
  logInOutline,
  logoApple,
  logoFacebook,
  logoGoogle,
  logOutOutline,
  menuOutline,
  pricetagOutline,
} from 'ionicons/icons';

export const addNecessaryIcons = () => {
  addIcons({
    pricetagOutline,
    filterOutline,
    logInOutline,
    logOutOutline,
    add,
    close,
    locationOutline,
    arrowBackOutline,
    logoGoogle,
    logoApple,
    logoFacebook,
    closeOutline,
    checkmarkOutline,
    menuOutline,
    languageOutline,
  });
};

@Component({
  selector: 'finances-root',
  template: `
    <ion-app>
      <ion-router-outlet />
    </ion-app>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  title = 'finances';

  constructor() {
    addNecessaryIcons();
  }
}
