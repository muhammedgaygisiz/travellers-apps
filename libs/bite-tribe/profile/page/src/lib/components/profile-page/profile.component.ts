import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonAvatar,
  IonBadge,
  IonButton,
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { Bite, PublicUser } from 'model';

import { BiteComponent } from 'bite-tribe-common/bite';

@Component({
  selector: 'profile-page',
  templateUrl: 'profile.component.html',
  styleUrl: 'profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    IonAvatar,
    IonButton,
    BiteComponent,
    IonBadge,
    IonIcon,
  ],
})
export class ProfileComponent {
  isAuthenticated = input(false);
  biteCreator = input<PublicUser>();
  bites = input<any[]>();
  userId = input<string>();

  readonly logoutClick = output();
  readonly gotoSettings = output();
  readonly gotoMyBucketlists = output();
  readonly gotoMyBites = output();

  readonly biteClick = output<Bite>();
  readonly restaurantClick = output<Bite>();
  readonly likeButtonClick = output<{ likeType: string; biteId: string }>();

  biteCount = computed(() => {
    const bites = this.bites();

    return bites ? bites.length : 0;
  });

  badgeColor = computed(() => {
    const biteCount = this.biteCount();

    if (50 <= biteCount && biteCount < 100) {
      return 'green';
    }

    if (100 <= biteCount && biteCount < 1000) {
      return 'bronze';
    }

    if (1000 <= biteCount && biteCount < 10000) {
      return 'silver';
    }

    if (10000 <= biteCount) {
      return 'gold';
    }

    return '';
  });
}
