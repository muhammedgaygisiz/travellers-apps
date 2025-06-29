import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'profile-page',
  templateUrl: 'profile.component.html',
  styleUrl: 'profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageComponent],
})
export class ProfileComponent {
  isAuthenticated = input(false);

  readonly logoutClick = output();
  readonly gotoSettings = output();
  readonly gotoMyBucketlists = output();
  readonly gotoMyBites = output();
}
