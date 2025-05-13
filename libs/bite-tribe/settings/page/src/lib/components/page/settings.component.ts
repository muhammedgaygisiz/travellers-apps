import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonToggle,
} from '@ionic/angular/standalone';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonItem,
    IonLabel,
    IonToggle,
    IonButton,
    IonSelect,
    IonSelectOption,
    IonInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class PageSettings {
  user = input<any>();

  userImage = computed(() => {
    const user = this.user();

    const photoUrl =
      user.photoUrl ||
      user.providerData.find((provider: any) => provider.photoUrl)?.photoUrl;

    console.log('#mo photoUrl', photoUrl);
    return photoUrl;
  });
}
