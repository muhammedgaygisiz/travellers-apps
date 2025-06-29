import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import { IonAvatar, IonButton, IonContent } from '@ionic/angular/standalone';
import { PublicUser } from 'model';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'profile-page',
  templateUrl: 'profile.component.html',
  styleUrl: 'profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent, IonContent, IonAvatar, IonButton],
})
export class ProfileComponent {
  isAuthenticated = input(false);
  biteCreator = input<PublicUser>();

  readonly logoutClick = output();
  readonly gotoSettings = output();
  readonly gotoMyBucketlists = output();
  readonly gotoMyBites = output();
}
